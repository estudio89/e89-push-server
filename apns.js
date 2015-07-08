function init(app) {
	var apn = require('apn');
	var websockets = require('./websockets.js');
	var apnConnection;
	var currentKeyFile;
	var currentCertFile;

	app.post("/push/send/apns/", function(req, res){
		var identifiers = req.body.identifiers;
		var keyFile = req.body.keyFile;
		var certFile = req.body.certFile;
		var production = req.body.production;
		var payload = req.body.payload;

		var notFound = websockets.sendToMobileDevice("ios", identifiers, payload);

		if (notFound.length === 0) { // All users were connected to the websocket
			res.json({ok:true});
			return;
		}

		if (keyFile !== currentKeyFile || certFile !== currentCertFile || typeof apnConnection === "undefined") {
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
	});
}

module.exports = init;