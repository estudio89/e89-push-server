function init(app) {
	var apn = require('apn');
	var apnConnection;
	var currentKeyFile;
	var currentCertFile;

	app.post("/push/send/apns/", function(req, res){
		var identifiers = req.body.identifiers;
		var keyFile = req.body.keyFile;
		var certFile = req.body.certFile;
		var production = req.body.production;

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
		["payload", "badge", "sound", "alert"].forEach(function(attr){
			note[attr] = req.body[attr];
		});
		apnConnection.pushNotification(note, devices);
		res.json({ok:true});
	});
}

module.exports = init;