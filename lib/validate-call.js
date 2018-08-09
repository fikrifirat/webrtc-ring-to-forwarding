module.exports = (req, res, next) => {
  const logger = req.app.locals.logger;
  req.locals = {auth: {}};

  // X-Voxbone-Context header is required
  if (!req.has('X-Voxbone-Context')) {
    logger.info('rejecting INVITE because it is missing X-Voxbone-Context');
    return res.send(603);
  }

  const context = req.get('X-Voxbone-Context');

  // syntax: X-Voxbone-Context: ring=to=+328989898
  // ..or whatever the ring-to number is E164 format

  context.split(',').forEach((item) => {
    const arr = item.split('=');
    const smatch = /(\+?\d+)/.exec(arr[1].trim());
    if (!smatch) {
      logger.info(`invalid X-Voxbone-Context header ${context}`);
      return res.send(500);
    }

    switch (arr[0].trim()) {
      case 'ring-to':
        req.locals.calledNumber = smatch[1];
        break;
      default:
        logger.info(`unexpected item ${arr[0]}`);
    }
  });

  if (!req.locals.calledNumber) logger.info('X-Voxbone-Context missing ring-to');
  else {
    logger.debug(req.locals, 'successfully parsed call details');
    return next();
  }

  res.send(603);
};
