var clients = {};
function init(server, app) {
	var io = require('socket.io')(server);

	// Send websocket push
	app.post('/push/send/ws/', function(req, res){
		var identifiers = req.body["identifiers"];
		var notFound = [];
		if (Object.prototype.toString.call( identifiers ) === '[object Array]') {
			console.log("WEBSOCKET: [DATA RECEIVED] = " + JSON.stringify(req.body));

			var eventType = req.body["type"];
			delete req.body["identifiers"];
			delete req.body["type"];
			req.body["timestamp"] = new Date().getTime() + "";

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

	app.get('/push/list/ws/', function(req, res){
		var listConnected = [];
		var count = 0;
		Object.keys(clients).forEach(function(key){
			var connectedDevice = {};
			connectedDevice[key] = Object.keys(clients[key]);
			count += connectedDevice[key].length;
			listConnected.push(connectedDevice);
		});

		res.json({"count":count, "devices":listConnected});
	});

	// Socket handling
	io.on('connection', function(socket){
		console.log('a user connected');
		var identifier;
		var deviceId;

		socket.on('register', function(data){
			identifier = data.identifier;
			deviceId = data.deviceId;
			console.log("registered user with identifier " + identifier + " and deviceId " + deviceId);
			if (typeof clients[identifier] === "undefined") {
				clients[identifier] = {};
			}
			clients[identifier][deviceId] = socket;
		});

		socket.on('joinRoom', function(roomName) {
			if (typeof socket.room !== "undefined") {
				socket.leave(socket.room);
			}
			socket.room = roomName;
			socket.join(roomName);
		});

		socket.on('leaveRoom', function() {
			if (typeof socket.room === "undefined") {
				return;
			}

			socket.leave(socket.room);
			socket.room = undefined;
		});

		socket.on('sendToRoom', function(data) {
			if (typeof socket.room === "undefined") {
				return;
			}

			var eventName = data.eventName;
			var eventData = data.eventData;
			socket.broadcast.to(socket.room).emit(eventName, eventData);

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
			socket.room = undefined;
		});
	});
}

function sendToMobileDevice(platform, identifiers, payload) {
	var notFound = [];
	if (typeof payload["type"] !== "undefined" && typeof clients[platform] !== "undefined") {
		identifiers.forEach(function(identifier, idx) {
			var socket = clients[platform][identifier];
			if (typeof socket !== "undefined") {
				// User is connected
				socket.emit(payload["type"], payload);
				console.log("Sent event of type " + payload["type"] + " to user with identifier" + identifier + "of platform " + platform + " connected to websocket.");
			} else {
				notFound.push(identifier);
			}
		});
	} else {
		notFound = identifiers;
	}

	return notFound;
}

module.exports = {
	"init":init,
	"sendToMobileDevice":sendToMobileDevice
}