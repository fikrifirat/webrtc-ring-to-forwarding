const Srf = require('drachtio-srf');
const srf = new Srf();
const logger = srf.locals.logger = require('pino')();
const config = require('config');
const validateCall = require('./lib/validate-call');
const parseUri = Srf.parseUri;

// connect to the drachtio sip server
srf.connect(config.get('drachtio'))
  .on('connect', (err, hp) => logger.info(`listening for sip traffic on ${hp}`))
  .on('error', (err) => logger.info(err, 'error connecting'));


// middleware to filter out calls that don't come from Voxbone
srf.use('invite', validateCall);

// handle validated incoming calls
srf.invite((req, res) => {
  const uri = parseUri(req.uri);
  const dest = `sip:${req.locals.calledNumber}@voxout.voxbone.com`;

  srf.createB2BUA(req, res, dest, {
    proxy: config.get('voxout.border-controller'),
    auth: config.get('voxout.auth'),
    headers: {
      from: `sip:${uri.user}@localhost`
    }
  })
    .then(({uas, uac}) => {
      logger.info('call connected');

      return setHandlers({uas, uac});
    })
    .catch((err) => {
      logger.info(`failed to connect call: ${err}`);
    });
});

function setHandlers({uas, uac}) {
  // when one side hangs up, hang up the other
  uas.on('destroy', () => uac.destroy());
  uac.on('destroy', () => uas.destroy());

  // handle re-INVITEs with changed SDP
  uas.on('modify', (req, res) => {
    return uac.modify(req.body)
      .then(() => res.send(200, {body: uac.remote.sdp}));
  });
  uac.on('modify', (req, res) => {
    return uas.modify(req.body)
      .then(() => res.send(200, {body: uas.remote.sdp}));
  });
}
