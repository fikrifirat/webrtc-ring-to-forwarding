const config = require('config');
const request = require('request');
const parseUri = require('drachtio-srf').parseUri;

module.exports = (req, res, next) => {
  const logger = req.app.locals.logger;
  req.locals = {auth: {}};

  // only accepting calls from Voxbone
  if ('Vox Callcontrol' !== req.get('User-Agent')) {
    logger.info('rejecting call that did not come from Voxbone');
    return res.send(603);
  }

  req.locals.calledNumber = config.get('ring-to');

  const uri = parseUri(req.uri);
  const from = req.getParsedHeader(req.get('From'));
  request.post(config.get('http-callback'), {
    json: true,
    body: {
      did: uri.user,
      callerId: from.user,
      callId: req.get('Call-ID')
    }
  }, (err, res, body) => {
    if (err) {
      logger.error(err, 'Error invoking web callback, connecting call to default ring-to number');
    }
    else if (body && body['ring-to']) {
      req.locals.calledNumber = body['ring-to'];
      logger.info(`received ring-to number ${req.locals.calledNumber}`);
    }
    else {
      logger.info('web callback did not supply ring-to, connecting to default');
    }
    next();
  });
};
