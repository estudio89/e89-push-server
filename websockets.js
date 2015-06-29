function init(server, app) {
	var io = require('socket.io')(server);

	// Send websocket push
	var clients = {};
	app.post('/push/send/ws/', function(req, res){
		var identifiers = req.body["identifiers"];
		var notFound = [];
		if (Object.prototype.toString.call( identifiers ) === '[object Array]') {

			var eventType = req.body["type"];
			delete req.body["identifiers"];
			delete req.body["type"];

			console.log("Send received - identifiers: " + identifiers + " - event: " + eventType);
			identifiers.forEach(function(identifier, idx){
				var allSockets = clients[identifier];
				if (typeof allSockets === "undefined") {
					notFound.push(identifier);
					return;
				}
				var deviceIds = Object.keys(allSockets)
				deviceIds.forEach(function(deviceId){
					var socket = allSockets[deviceId];
					if (typeof socket !== "undefined") {
						socket.emit(eventType, req.body);
					} else {
						notFound.push(identifier);
					}
				});
			});
		}

		res.json({"notFound":notFound});
	});

	// Socket handling
	io.on('connection', function(socket){
		console.log('a user connected');
		var identifier;
		var deviceId;

		socket.on('register', function(data){
			identifier = data.identifier;
			deviceId = data.deviceId;
			console.log("registered user with identifier: " + identifier);
			if (typeof clients[identifier] === "undefined") {
				clients[identifier] = {};
			}
			clients[identifier][deviceId] = socket;
		});

		socket.on('disconnect', function(){
			console.log("user with identifier " + identifier + " and deviceId " + deviceId + " disconnected.");
			if (typeof clients[identifier] !== "undefined") {
				delete clients[identifier][deviceId];
				var deviceIds = Object.keys(clients[identifier]);
				if (deviceIds.length == 0) {
					delete clients[identifier];
				}
			}
		});
	});
}

module.exports = init;