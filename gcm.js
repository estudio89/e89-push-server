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

		if (typeof payload["type"] !== "undefined" && typeof websockets.clients["android"] !== "undefined") {
			// Trying to send by websocket
			var notFound = [];
			identifiers.forEach(function(identifier, idx) {
				var socket = websockets.clients["android"][identifier];
				if (typeof socket !== "undefined") {
					// User is connected
					socket.emit(payload["type"], payload);
					console.log("Sent event of type " + payload["type"] + " to Android user connected to websocket.");
				} else {
					notFound.push(identifier);
				}
			});
		}

		if (notFound.length === 0) {
			// All users were connected to the websocket
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

		sender.send(message, identifiers);
		res.json({ok:true});
	});
}

module.exports = init;