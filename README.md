# Overview
This tutorial provides step-by-step instructions on setting up a hosted SIP server so that WebRTC-enabled Click to Calls through Voxbone are forwarded via VoxOUT to a mobile or other PSTN number.

As background, Voxbone provides a client-side JavaScript library that enables our customers to put a Click to Call button on their websites. When a user clicks the button, a call is initiated from the browser via WebRTC to a Voxbone DID. Customers have the ability to configure the routing for that DID, such that the call will be delivered to their IP PBX or other SIP endpoint.

However, some customers do not have PBXs, and would like to simply forward these calls to their mobile phone or equivalent -- i.e. a form of routing known as a “Ring-To” number. Though this feature is not natively supported by Voxbone, a customer can achieve the desired routing by implementing a simple hosted SIP server as shown in this tutorial. 
To do this, we will spin up a hosted server and then run a simple SIP call-processing application that receives incoming VoxDID calls and “hairpins” them back, using VoxOUT to connect to a specific mobile number or other PSTN number. To make the set-up easier, we will include Docker images.

# Prerequisites
The following items are required in order to implement the Click to Call forwarding feature described in this tutorial:
- A Digital Ocean account (Note: this tutorial uses Digital Ocean to host the forwarding application, but any hosted service provider may be used.)
- A Voxbone account with one or more VoxDIDs that have enabled VoxOUT and WebRTC.
- SIP credentials for placing outbound calls through VoxOUT.

# Steps
## Provision a hosted server
To simplify things, we will use Docker images. Digital Ocean allows you to create a docker server via a “One-click” app, as shown in the image below. We’ll select a cheap image since we don’t need a great deal of memory or disk space for this application.

1. First, click on Create in the header toolbar on the home page to create a new “Droplet” cloud server.

2. Then, go to the One-click apps tab and select Docker. Scroll down to pick server specifications and create your Docker server.

3. Once the server has been arranged, verify that you can SSH into the server.  

Note that, by default, only ports 22 (SSH), 80 (HTTP), and 443 (HTTPS) are open to the internet. We also need port 5060 open to allow signaling traffic from Voxbone.  We only want to allow traffic in from known Voxbone servers, so consult the latest list of signaling addresses here:

https://www.voxbone.com/network/interconnect

Then execute the following command for each signaling address:

  ufw allow from <address> to any port 5060
  
```bash
	ufw allow from 81.201.82.45 to any port 5060
	ufw allow from 81.201.84.195 to any port 5060
	ufw allow from 81.201.85.45 to any port 5060
	ufw allow from 81.201.83.45 to any port 5060
	ufw allow from 81.201.86.45 to any port 5060
```

as shown below:


(Note: you can ignore the warnings above regarding “/” being writable.)
Install the application

The application we’re going to run is available to download on GitHub: https://github.com/voxbone-workshop/webrtc-ring-to-forwarding

After logging into your hosted docker server, use ‘git’ to download the application:

```bash
git clone https://github.com/voxbone-workshop/webrtc-ring-to-forwarding.git
```

We are using Docker to run the SIP call-processing engine as well as the Node.js application server. More specifically, we will use Docker Compose to create a Docker network with two containers: one to run the SIP call-processing engine and one to run Node.js and our application.
Configure the application
After you download the application from GitHub, you will need to make two changes. Let’s walk through each in turn.

You will need to edit the Docker Compose file to put in the public IP address of your hosted server


To do this, use ‘vi’ or another editor to edit the Docker Compose file, as shown below:

```bash
vi ~/webrtc-ring-to-forwarding/docker-compose-network.yml
```

In that file, change the line that looks like this:

```bash
command: drachtio --contact "sip:*;transport=udp" \
--external-ip <your-public-ip-here> \ 
--loglevel info --sofia-loglevel 9 --mtu 4096
```

to indicate the public IP address of your hosted server (as the value for the `--external-ip` parameters). Then save and close the file.

2. You will need to put your VoxOUT SIP credentials (i.e. username and password) in the application configuration file.

To do this, you’ll need to alter the file below:

```bash
	vi ~/webrtc-ring-to-forwarding/config/production.json
```
For the lines that look like this:

```json
  "voxout": {
    "auth": {
      "username": "<your-voxout-username-here>",
      "password": "<your-voxout-password-here"      
    },
```

input your voxOUT SIP credentials where indicated. Then save and close the file.

We’re almost done!


3. Now we can start the Docker containers. Run the following command:

```bash
docker-compose -f webrtc-ring-to-forwarding/docker-compose-network.yml up -d 
```

You should see the Docker network created and the two containers start:


At this point, the server is ready to receive calls! The final step is to configure your WebRTC settings in the Voxbone portal to send calls to your server.

## Configuring your Voxbone DID
Make sure you have a VoxDID that has VoxOUT and WebRTC capability.  

1. First, we will need to create a new Voice URI to route to. Log into the Voxbone portal and select Configure / Voice URIs. Create a new voice URI as below, but with the IP address of your hosted server:
```
	{E164}@<your-public-ip-here>
```
e.g.
	{E164}@208.81.2.162

2. Next, associate that Voice URI with your selected DID.

3. Finally, in the Configure / DIDs section, select your DID and click the WebRTC “wand” in the column labeled WebRTC.

4. In the panel that appears (the Voxbone Widget Generator), click Advanced Configuration. In the input field labeled Context, enter the telephone number that you want Click to Calls routed to, in the following E164 format (replacing the number below with the one you want to receive calls):

	ring-to: +32493400606

e.g.




## Testing your Click to Call widget
All done! Now you’re ready to test your work. On the Voxbone widget page, below the text box showing the generated HTML, click either the JSFiddle or CodePen buttons. This will bring up a new browser window containing a blue Call Now button.  Simply click the button to generate a WebRTC call!(Make sure to allow the browser access to your microphone if prompted.)  

This will generate a WebRTC call to your VoxDID, which should then ring the number that you entered into the Context field shown above. 
Troubleshooting and Operational Tasks
If you make a change to the SIP application or configuration files on your hosted server, you will need to restart the Docker network for those changes to take effect, as displayed below

To view logs for either the SIP server or the Node.js application, first run the “docker ps” command to get the names of the running containers:


Then, for instance, to view SIP traces for calls passing through the server, you can run this:
```bash
	docker logs webrtcringtoforwarding_drachtio_1
```
To stream the logs, use the “-f” command:
```bash
	docker logs -f webrtcringtoforwarding_drachtio_1
```
Similarly, the application logs can be viewed using this command:
```bash
	docker logs webrtcringtoforwarding_nodejs_1
```

# Going further: customizing the application
Now you’ve successfully set up a simple SIP call-forwarding server that works well for most of our customers’ needs. It receives a WebRTC call to a VoxDID and uses the VoxOUT service to forward the call to a Ring-To number.

However, for those interested in adding customer-specific features, you can augment the functionality. For example, a web callback could be implemented to dynamically retrieve the Ring-To number, instead of having to supply it in the Context field of the HTML widget.

This feature could be useful, for instance, in order to provide time of day-based routing, trigger CRM functionality when an incoming call arrives, or simply hide the Ring-To number (within the browser’s HTML text).

All the  step-by-step changes are described  below. In addition, the full source code can be found in the “web-callback” branch of the GitHub repo, where you previously downloaded the application.

Please note: the application is built using Node.js and drachtio, so some familiarity with each will be required to make changes to it. Node.js is a server-side JavaScript programming environment, and drachtio is a SIP server that includes a Node.js npm module.
Feature overview
Our new feature is simple: when a new incoming call arrives, we will make an HTTP POST request to a web callback.  

We’ll provide information including the VoxDID being used, the caller ID, and some of the SIP call details (e.g. SIP Call-ID) that might be useful for tracking purposes.  

The response to our HTTP request will include the connecting Ring-To number.  We’ll also add configuration parameters to the application (in config/production.json, which you edited earlier) for the HTTP URL, as well as a default Ring-To number to connect the call if the HTTP request fails or the response does not provide a Ring-To number.

Please note: the following steps assume that your starting point with the code is the checked-out “master” branch. If you simply want to follow along and see the finished code base, check out and view the “web-callback” branch instead.

Step 1: Add ‘request’ module for HTTP client request functionality

Since we’ll  use the request module to make HTTP requests, we must first add it to our project. From the project root directory, input the command as follows:

```bash
npm install --save request
```

This will update our package.json to indicate that ‘request’ is a dependency of our project, and will also download and install it into our node_modules directory.

Step 2: Add configuration for HTTP URL and default Ring-To number
Edit config/production.json to specify the HTTP URL of your web callback and the default Ring-To number. When finished your production.json should look like the below code, but with your specific values replacing the content inside the “<>” brackets.

```json
{
  "drachtio": {
    "host": "drachtio",
    "port": 9022,
    "secret": "cymru"
  },
  "voxout": {
    "auth": {
      "username": "<your-voxout-username-here>",
      "password": "<your-voxout-password-here>"      
    },
    "border-controller": "sip:81.201.82.250"
  },
  "http-callback": "<http://your.callback.address.here>",
  "ring-to": "<your-ring-to-number-here-in-E164-format>"
}
```

Step 3: Add drachtio middleware to retrieve Ring-To number using callback
The drachtio concept of middleware can be executed when handling an incoming SIP request, such as the INVITE that arrives to indicate a new call has been placed.

The application is already using a middleware function to filter out calls that do not come from Voxbone or have a custom SIP X-Voxbone-Context header. You can view that middleware function in lib/validate-call.js.

We are going to change that middleware function in three ways:
Eliminate the check for the X-Voxbone-Context header. (It will no longer be required, since we’ll get the Ring-To number via the web callback or configuration file.)
Read the default Ring-To number from the configuration file.
Invoke the web callback and possibly get a new Ring-To number returned that will override the default.

You will see that lib/validate-call.js starts like this:

```javascript
module.exports = (req, res, next) => {
  const logger = req.app.locals.logger;
  req.locals = {auth: {}};

  // only accepting calls from Voxbone
  if ('Vox Callcontrol' !== req.get('User-Agent')) {
    logger.info('rejecting call that did not come from Voxbone');
    return res.send(603);
  }
```

Leave that part of the function in place, and delete everything below it. (We are removing the code that parsed the Ring-To number from the custom SIP header.)

Add the following lines at the very top of the file:

```javascript
const config = require('config');
const request = require('request');
const parseUri = require('drachtio-srf').parseUri;
```

This brings in the functionality that we are going to use in order to read configuration parameters and make HTTP client requests.

At the bottom of the file (which is now just below the ‘if’ clause that checks the User-Agent header), retrieve and save the default Ring-To number:

```javascript
req.locals.calledNumber = config.get('ring-to');
```

Next, we need to add the code to implement the HTTP callback. Add the code shown below, so that when you are done the complete file now looks like this:
```javascript
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
  const from = req.getParsedHeader('From');
  const callerId = from.uri ? parseUri(from.uri).user : '';
  request.post(config.get('http-callback'), {
    json: true,
    body: {
      did: uri.user,
      callerId: callerId,
      callId: req.get('Call-ID')
    }
  }, (err, res, body) => {
    if (err) {
      logger.error(err, 'Error invoking callback, using default');
    }
    else if (body && body['ring-to']) {
      req.locals.calledNumber = body['ring-to'];
      logger.info(`received ring-to number ${req.locals.calledNumber}`);
    }
    else {
      logger.info('callback did not supply ring-to, using default');
    }
    next();
  });
};
```


The code that we added will:
Parse the VoxDID out of the SIP Request-URI of the incoming INVITE.
Parse the caller ID out of the SIP From header.
Execute the HTTP callback via a POST with a JSON body that includes the DID, caller ID, and SIP Call-ID.
Substitute the value provided as the Ring-To number, overriding the default, if a 200 OK is received with a JSON payload that includes a Ring-To property., 
After making these changes, restart the application on the server:

```bash
docker-compose -f webrtc-ring-to-forwarding/docker-compose-network.yml down

docker-compose -f webrtc-ring-to-forwarding/docker-compose-network.yml up -d
```

Step 4: Remove Context data from WebRTC widget 
Now that we no longer are passing the Ring-To number in the X-Voxbone-Context header, we can update the WebRTC widget to remove that data.  

Go into the Voxbone widget generator and clear out the field labeled Context.
Step 5: Test your web callback
Now you’re ready to run a test! If you have completed the task of implementing your web callback, you can test it by making a call from the JSFiddle or CodePen generated from the Voxbone portal WebRTC widget generator.

If not, you can test everything from end to end by creating a simple web callback through  the steps below. .

This involves  writing a simple web application using express and running it from a laptop, using ngrok to provide a publicly-accessible HTTPS URL for your web callback. 
Please note: if you want to follow along, you will need Node.js and ngrok installed on your laptop.
Step 5.1: Write a simple web callback
Once you have installed Node.js and ngrok, create a new folder on your laptop and open a terminal window.  Inside the new folder, run the following command:

```bash
npm init
```

Accept all the defaults, and press ‘y’ at the final prompt to generate a package.json.  

Next, install the following modules:
```bash
npm install --save express body-parser
```
Now create a new file named ‘index.js’ and add the following code:
```javascript
const express = require('express');
const bodyParser = require('body-parser');
const jsonParser = bodyParser.json();
const app = express();

app.post('/', jsonParser, (req, res) => {
  console.log(`got web callback with ${JSON.stringify(req.body)}`);
  res.json({'ring-to': '+3228080000'}); //voxbone IVR
});

app.listen(3000, () => console.log('webapp listening on port 3000'));
```
Finally, start the application:
```bash
$ node index.js 
webapp listening on port 3000
```
Our web application is now listening and ready to respond to our requests. But it’s running on our laptop -- most likely in a private network that is unreachable from our hosted server. That is where ngrok comes in.
Step 5.2: Use ngrok to create a tunnel to your HTTP service

Start ngrok and instruct it to create a tunnel to port 3000 for HTTP traffic:
```bash
ngrok http 3000
```
This will open a screen that looks something like this:

Copy the HTTPS address generated by ngrok (e.g., ‘https://5f4c462e.ngrok.io’ in the example above) and add it to your config/production.json on your hosted server as the value for the ‘http-callback’ property. Then restart your application by running the Docker Compose ‘down’ and ‘up’ commands provided earlier.

Step 5.3: Make a test call
Now you can place a test call through JSFiddle or CodePen, using the widget generated by the Voxbone WebRTC widget generator.

You should see the simple web app receive and log the HTTP POST request:
```bash
$ node index.js 
webapp listening on port 3000
got web callback with {"did":"17162261128","callerId":"dhorton","callId":"6YWSHZETRBFFDBMM3XNUXXMAWM@81.201.82.107"}
```

