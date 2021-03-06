function init(app) {
	var gcm = require('node-gcm');
	var websockets = require('./websockets.js');
	var utils = require('./utils.js');
	var http;

	var sender;
	var currentApiKey;

	app.post("/push/send/gcm/", function(req, res){
		var identifiers = req.body.identifiers;
		var apiKey = req.body.apiKey;
		var collapseKey = req.body.collapseKey;
		var payload = req.body.payload;
		var processResponse = req.body.processResponse;
		var title = req.body.title;
		var description = req.body.description;

		// Setting timestamp
		payload["timestamp"] = new Date().getTime() + "";

		console.log("GCM: [DATA RECEIVED] = " + JSON.stringify(req.body));

		var notFound = websockets.sendToMobileDevice("android", identifiers, payload);

		if (apiKey !== currentApiKey || typeof sender == "undefined") {
			currentApiKey = apiKey;
			sender = new gcm.Sender(currentApiKey);
		}

		var messageData = {
			"collapseKey": collapseKey,
			"priority": "high",
			"click_action": 'FLUTTER_NOTIFICATION_CLICK'
		};

		messageData["data"] = payload;

		if (!!title && !!description) {
			messageData["notification"] = {
				"title": title,
				"body": description
			};
		}

		var message = new gcm.Message(messageData);

		function performSend(message, identifiers) {
			sender.send(message, identifiers, undefined, function(error, result) {

				// Checking if any registration ids were changed or removed
				var toDelete = [];
				var shouldChange = [];
				result.results.forEach(function(res, idx) {
					if (res.error === "NotRegistered") {
						toDelete.push(identifiers[idx]);
					} else if (typeof res.registration_id !== "undefined") {
						shouldChange.push({"old":identifiers[idx], "new":res.registration_id});
					}

				});

				if (toDelete.length > 0 || shouldChange.length > 0) {
					var requestBody = JSON.stringify({"toDelete": toDelete, "shouldChange": shouldChange});
					var host = process.env.MAIN_HOST || processResponse.host;
					var port = process.env.MAIN_HOST_PORT || processResponse.port;

					var post_options = {
						method: 'POST',
					    headers: {
					        'Content-Type': 'application/json',
					        'Content-length': Buffer.byteLength(requestBody, 'utf8')
					    },
					    host:host,
					    path:processResponse.path,
					    port:port,
					};
					console.log("GCM PROCESS REQUEST SIZE = " + Buffer.byteLength(requestBody, 'utf8'));
					http = require(port === '443' ? 'https' : 'http');
					var procReq = http.request(post_options);

					procReq.write(requestBody);
					procReq.end();
				}

			});

			console.log("GCM: sent push to " + identifiers);
		}

		utils.delayedSend("GCM", message, identifiers, performSend)

		res.json({ok:true});
	});
}

module.exports = init;