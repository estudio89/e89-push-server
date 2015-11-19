function init(app) {
	var apn = require('apn');
	var websockets = require('./websockets.js');
	var http = require('http');
	var apnConnection;
	var currentKeyFile;
	var currentCertFile;
	var feedback;

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

		if (keyFile !== currentKeyFile || certFile !== currentCertFile || typeof apnConnection === "undefined" || typeof feedback === "undefined") {
			if (typeof apnConnection !== "undefined") {
				apnConnection.shutdown();
			}
			currentCertFile = certFile;
			currentKeyFile = keyFile;

			apnConnection = new apn.Connection({
				"cert": currentCertFile,
				"key": currentKeyFile,
				"production": production
			});


			feedback = new apn.Feedback({
			    "batchFeedback": true,
			    "interval": 300,
			    "cert": currentCertFile,
				"key": currentKeyFile,
				"production": production
			});
		}

		// Receivers list
		var devices = [];
		identifiers.forEach(function(identifier){
			devices.push(new apn.Device(identifier));
		});

		// Notification object
		var note = new apn.Notification();
		note.expiry = Math.floor(Date.now() / 1000) + 3600; // Expires 1 hour from now.
		note.contentAvailable = 1;
		["payload", "badge", "sound", "alert"].forEach(function(attr){
			note[attr] = req.body[attr];
		});
		apnConnection.pushNotification(note, devices);
		res.json({ok:true});


		// Feedback service
		feedback.on("feedback", function(devices) {
			var toDelete = [];
		    devices.forEach(function(item) {
		    	toDelete.push(item.device.token.toString("hex"));
		    });

		    // Notifying server
		    var requestBody = JSON.stringify({"toDelete": toDelete});

			var post_options = {
				method: 'POST',
			    headers: {
			        'Content-Type': 'application/json',
			        'Content-length': Buffer.byteLength(requestBody, 'utf8')
			    },
			    host:processResponse.host,
			    path:processResponse.path,
			    port:processResponse.port,
			};


			var procReq = http.request(post_options);

			procReq.write(requestBody);
			procReq.end();

		});
	});

}

module.exports = init;