function init(app) {
	var gcm = require('node-gcm');
	var websockets = require('./websockets.js');

	var sender;
	var currentApiKey;

	app.post("/push/send/gcm/", function(req, res){
		var identifiers = req.body.identifiers;
		var apiKey = req.body.apiKey;
		var collapseKey = req.body.collapseKey;
		var payload = req.body.payload;

		// Setting timestamp
		payload["timestamp"] = new Date().getTime() + "";

		console.log("GCM: [DATA RECEIVED] = " + JSON.stringify(req.body));

		var notFound = websockets.sendToMobileDevice("android", identifiers, payload);

		if (apiKey !== currentApiKey || typeof sender == "undefined") {
			currentApiKey = apiKey;
			sender = new gcm.Sender(currentApiKey);
		}

		var message = new gcm.Message({
			"collapseKey": collapseKey,
			"data": payload
		});

		sender.send(message, identifiers);
		console.log("GCM: sent push to " + identifiers);
		res.json({ok:true});
	});
}

module.exports = init;