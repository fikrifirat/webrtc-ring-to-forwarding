module.exports = connectCall;

function connectCall(req, res) {
  const srf = req.app;
  const logger = srf.locals.logger;
  const opts = req.voxboneContext;

  srf.invite((req, res) => {
    const dest = `sip:${opts['ring-to']}@voxbone.com`;
    srf.createB2BUA(dest, req, res, {
      auth: {
        username: opts.username,
        password: opts.password
      }
    })
      .then(({uas, uac}) => {
        logger.info('call connected');

        // when one side terminates, hang up the other
        uas.on('destroy', () => uac.destroy());
        uac.on('destroy', () => uas.destroy());
        return;
      })
      .catch((err) => {
        logger.info(`failed to connect call: ${err}`);
      });
  });
}
