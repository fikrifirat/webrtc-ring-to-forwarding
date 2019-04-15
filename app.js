const Srf = require('drachtio-srf');
const srf = new Srf();
const logger = srf.locals.logger = require('pino')();
const config = require('config');
const validateCall = require('./lib/validate-call');
const parseUri = Srf.parseUri;
const request = require('request');

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
  const from = req.getParsedHeader('From');
  const callerId = from.uri ? parseUri(from.uri).user : '';

  logger.info("attempting a call from " + uri.user + " to:" + req.locals.calledNumber);
  srf.createB2BUA(req, res, dest, {
    proxy: config.get('voxout.border-controller'),
    auth: config.get('voxout.auth'),
    headers: {
      from: `sip:${uri.user}@localhost`
    }
  })
    .then(({uas, uac}) => {
      logger.info('call connected');
      const uri = parseUri(req.uri);
      const from = req.getParsedHeader('From');
      const callerId = from.uri ? parseUri(from.uri).user : '';
      var d = new Date();
      var n = d.toISOString();
      var webhookUrl = config.get('http-callback');
      if(req.locals.metadata.webhookUrl)
      {
          webhookUrl = req.locals.metadata.webhookUrl;
      }
      request.post(webhookUrl, {
		json: true,
    		body: {
      			did: uri.user,
      			callerId: callerId,
    	  		callId: req.get('Call-ID'),
			destination: req.locals.calledNumber,
			connectedAt: n,
			metadata: req.locals.metadata
    			}
  		}, (err, res, body) => {
    			if (err) {
      				logger.error(err, 'Error invoking callback, to url '+ webhookUrl);
    			}
    			//else if (body && body['ring-to']) {
      			//	req.locals.calledNumber = body['ring-to'];
      			//	logger.info('received ring-to number '+ req.locals.calledNumber );
    			//}
   	 		//else {
     			// logger.info('callback did not supply ring-to, using default');
    		//	}
   	 	//next();
  		});

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
