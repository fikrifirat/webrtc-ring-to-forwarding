users = new Map();
users.set('1', '+32493400606');
users.set('2', '+32492178881');
const Srf = require('drachtio-srf');
const srf = new Srf();
const parseUri = Srf.parseUri;

module.exports = (req, res, next) => {
  const logger = req.app.locals.logger;
  req.locals = {auth: {}};

  // only accepting calls from Voxbone
  if ('Vox Callcontrol' !== req.get('User-Agent')) {
    logger.info('rejecting call that did not come from Voxbone');
    return res.send(603);
  }

  // X-Voxbone-Context header is required
  if (!req.has('X-Voxbone-Context')) {
    logger.info('INVITE is missing X-Voxbone-Context, treating as PSTN call');
    const uri = parseUri(req.uri);
    const from = req.getParsedHeader('From');
    logger.info(JSON.stringify(from));
    const fromUri = parseUri(from.uri);
    //extract masked numbers
    let u1 = uri.params.u1 ? decodeURIComponent(uri.params.u1) : null;
    let u2 = uri.params.u2 ? decodeURIComponent(uri.params.u2) : null;
    let faxfwd = uri.params.fax ? decodeURIComponent(uri.params.fax) : null;
    logger.info('URI extracted. u1='+u1+';u2='+u2+';fax='+faxfwd );
    if(u1 != null || u2 != null)
    {
    var session = {
      "user1":u1,
      "user2":u2
    };
    //return res.send(603);
    logger.info("DID:uri.user="+uri.user+",callingNumber:fromUri.user="+fromUri.user);
    if(fromUri.user == session.user1)
    {
      logger.info("caller is user1:"+session.user1+" destination is user2:"+session.user2);
      req.locals.calledNumber = session.user2;
    }
    else {
      logger.info("caller is user2:"+session.user2+" destination is user1:"+session.user1);
      req.locals.calledNumber = session.user1;
    }
    }
    else if(faxfwd != null )
    {
	logger.info("forwarding fax:"+faxfwd);
        req.locals.calledNumber = faxfwd;
    }
    
     return next();
  }
  else
  {

  const context = req.get('X-Voxbone-Context');

  // syntax: X-Voxbone-Context: ring=to=+328989898
  // ..or whatever the ring-to number is E164 format
  try{
    var obj = JSON.parse(context);
    req.locals.metadata = obj;
    logger.info(`extracted call metadata:`+ JSON.stringify(obj));
  }
  catch(e){
   logger.info(`context not json:` + context+ `error:`+e);
  }
  if(!req.locals.metadata){
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
      case 'ring-user':
        if(users.get(smatch[1]) != undefined){
          req.locals.calledNumber = users.get(smatch[1]);
        }
        else {
          logger.info(`user number map not found in ring-user value in X-Voxbone-Context header ${context}`);
        }
      default:
        logger.info(`unexpected item ${arr[0]}`);
    }
  });
  }
  else
  { 
    req.locals.calledNumber = req.locals.metadata.destination;
    logger.info(`set called number using metadata object:` + req.locals.metadata);
  }

  if (!req.locals.calledNumber) logger.info('X-Voxbone-Context missing ring-to');
  else {
    logger.debug(req.locals, 'successfully parsed call details');
    return next();
  }

  res.send(603);
  }
};
