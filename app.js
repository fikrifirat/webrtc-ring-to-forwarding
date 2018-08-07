const Srf = require('drachtio-srf');
const srf = new Srf();
const logger = srf.locals.logger = require('pino')();
const config = require('config');
const validateCall = require('./lib/validate-call');
const connectVoxout = require('./lib/connect-call');

srf.connect(config.get('drachtio'))
  .on('connect', (err, hp) => logger.info(`listening for sip traffic on ${hp}`))
  .on('error', (err) => logger.info(err, 'error connecting'));


srf.use('invite', validateCall);
srf.invite(connectVoxout);
