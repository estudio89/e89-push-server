function init(app) {
	var apn = require('apn');
	var Raven = require('raven');
	var websockets = require('./websockets.js');
	var utils = require('./utils.js');
	var http;

	var apnConnectionCache = {};
	var feedbackConnectionCache = {};

	function loadConnection(certFile, keyFile, processResponse, production) {
		var apnConnection = apnConnectionCache[certFile];
		var feedback = feedbackConnectionCache[certFile];

		if ((typeof apnConnection === "undefined" || apnConnection.terminated) || typeof feedback === "undefined") {
			apnConnection = new apn.Connection({
				"cert": certFile,
				"key": keyFile,
				"production": production
			});

			apnConnection.on("transmissionError", function(error, notification, recipient) {
				// Raven.captureException(new Error("APNS transmission error. Code: " + error + " | Payload: " + JSON.stringify(notification.payload) + " | Recipient: " + JSON.stringify(recipient)));
				loadConnection(certFile, keyFile, production);
			});


			feedback = new apn.Feedback({
			    "batchFeedback": true,
			    "interval": 300,
			    "cert": certFile,
				"key": keyFile,
				"production": production
			});
			feedback.processResponse = processResponse;

			// Feedback service
			feedback.on("feedback", function(devices) {

				var toDelete = [];
			    devices.forEach(function(item) {
			    	toDelete.push(item.device.token.toString("hex"));
			    });

			    // Notifying server
			    if (toDelete.length > 0) {
				    var requestBody = JSON.stringify({"toDelete": toDelete});
				    var host = process.env.MAIN_HOST || feedback.processResponse.host;
				    var port = process.env.MAIN_HOST_PORT || feedback.processResponse.port;

					var post_options = {
						method: 'POST',
					    headers: {
					        'Content-Type': 'application/json',
					        'Content-length': Buffer.byteLength(requestBody, 'utf8')
					    },
					    host:host,
					    path:feedback.processResponse.path,
					    port:port,
					};
					console.log("APNS: Will delete devices: " + toDelete);
					console.log("APNS PROCESS REQUEST SIZE = " + Buffer.byteLength(requestBody, 'utf8'));
					http = require(port === '443' ? 'https' : 'http');
					var procReq = http.request(post_options);

					procReq.write(requestBody);
					procReq.end();

			    }

			});

			apnConnectionCache[certFile] = apnConnection;
			feedbackConnectionCache[certFile] = feedback;
		}
	}

	app.post("/push/send/apns/", function(req, res){
		var identifiers = req.body.identifiers;
		var keyFile = req.body.keyFile;
		var certFile = req.body.certFile;
		var production = req.body.production;
		var payload = req.body.payload;
		var processResponse = req.body.processResponse;

		// Setting timestamp
		payload["timestamp"] = new Date().getTime();
		console.log("APNS: [DATA RECEIVED] = " + JSON.stringify(req.body));
		var notFound = websockets.sendToMobileDevice("ios", identifiers, payload);

		loadConnection(certFile, keyFile, processResponse, production);

		// Notification object
		var note = new apn.Notification();
		note.expiry = Math.floor(Date.now() / 1000) + 3600*24; // Expires 24 hours from now.
		note.contentAvailable = 1;
		["payload", "badge", "sound", "alert"].forEach(function(attr){
			note[attr] = req.body[attr];
		});

		function performSend(notification, identifiers) {
			// Receivers list
			var devices = [];
			identifiers.forEach(function(identifier){
				try {
					devices.push(new apn.Device(identifier));
				} catch (err) {
					Raven.captureException(new Error("Invalid APNS token: " + identifier));
				}

			});

			var apnConnection = apnConnectionCache[certFile];
			apnConnection.pushNotification(notification, devices);

			console.log("APNS: [NOTIFIED] = " + identifiers);
		}

		utils.delayedSend("APNS", note, identifiers, performSend);

		res.json({ok:true});

	});

}

module.exports = init;

