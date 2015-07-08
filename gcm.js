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

		var notFound = websockets.sendToMobileDevice("android", identifiers, payload);

		if (notFound.length === 0) { // All users were connected to the websocket
			res.json({ok:true});
			return;
		}

		if (apiKey !== currentApiKey || typeof sender == "undefined") {
			currentApiKey = apiKey;
			sender = new gcm.Sender(currentApiKey);
		}

		var message = new gcm.Message({
			"collapseKey": collapseKey,
			"data": payload
		});

		sender.send(message, notFound);
		res.json({ok:true});
	});
}

module.exports = init;