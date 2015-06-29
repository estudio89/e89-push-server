function init(app) {
	var gcm = require('node-gcm');
	var sender;
	var currentApiKey;

	app.post("/push/send/gcm/", function(req, res){
		var identifiers = req.body.identifiers;
		var apiKey = req.body.apiKey;
		var collapseKey = req.body.collapseKey;
		var payload = req.body.payload;

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