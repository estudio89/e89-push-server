function init(app) {
	var apn = require('apn');
	var websockets = require('./websockets.js');
	var http;

	var apnConnectionCache = {};
	var feedbackConnectionCache = {};

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

		var apnConnection = apnConnectionCache[certFile];
		var feedback = feedbackConnectionCache[certFile];
		if (typeof apnConnection === "undefined" || typeof feedback === "undefined") {
			apnConnection = new apn.Connection({
				"cert": certFile,
				"key": keyFile,
				"production": production
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

					var post_options = {
						method: 'POST',
					    headers: {
					        'Content-Type': 'application/json',
					        'Content-length': Buffer.byteLength(requestBody, 'utf8')
					    },
					    host:feedback.processResponse.host,
					    path:feedback.processResponse.path,
					    port:feedback.processResponse.port,
					};

					http = require(processResponse.port === '443' ? 'https' : 'http');
					var procReq = http.request(post_options);

					procReq.write(requestBody);
					procReq.end();

			    }

			});

			apnConnectionCache[certFile] = apnConnection;
			feedbackConnectionCache[certFile] = feedback;
		}

		// Receivers list
		var devices = [];
		identifiers.forEach(function(identifier){
			devices.push(new apn.Device(identifier));
		});

		// Notification object
		var note = new apn.Notification();
		note.expiry = Math.floor(Date.now() / 1000) + 3600*24; // Expires 24 hours from now.
		note.contentAvailable = 1;
		["payload", "badge", "sound", "alert"].forEach(function(attr){
			note[attr] = req.body[attr];
		});
		apnConnection.pushNotification(note, devices);
		res.json({ok:true});

	});

}

module.exports = init;