// Requirements
var express = require('express');
var bodyParser = require('body-parser');


// App initialization
var app = express();
var jsonParser = bodyParser.json();
app.use(jsonParser);

// Server and sockets
var server = require('http').Server(app);
var io = require('socket.io')(server);

server.listen(8081, function(){
  console.log('listening on *:8081');
});


// Routes
app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

var clients = {};
app.post('/send/', function(req, res){
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
