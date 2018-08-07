module.exports = (req, res, next) => {
  const logger = req.app.locals.logger;
  if (req.has('X-Voxbone-Context')) {
    const context = req.get('X-Voxbone-Context');
    try {
      const opts = JSON.parse();
      if (!opts.username) logger.info('X-Voxbone-Context missing username');
      else if (!opts.password) logger.info('X-Voxbone-Context missing username');
      else if (!opts['ring-to']) logger.info('X-Voxbone-Context missing ring-to');
      else {
        req.voxboneContext = opts;
        next();
      }

    } catch (err) {
      logger.info(`rejecting INVITE because X-Voxbone-Context does not contain valid JSON: ${context}`);
    }
  }
  else {
    logger.info('rejecting INVITE because it is missing X-Voxbone-Context');
  }

  res.send(603);
};
