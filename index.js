var express = require('express');
var bodyParser = require('body-parser');

var app = express();

var jsonParser = bodyParser.json();

var server = require('http').Server(app);
var io = require('socket.io')(server);

var clients = {};

server.listen(8081, function(){
  console.log('listening on *:8081');
});

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

app.post('/send/', jsonParser, function(req, res){
	var identifiers = req.body["identifiers"];
	if (Object.prototype.toString.call( identifiers ) === '[object Array]') {

		var eventType = req.body["type"];
		delete req.body["identifiers"];
		delete req.body["type"];

		console.log("Send received - identifiers: " + identifiers + " - event: " + eventType);
		identifiers.forEach(function(identifier, idx){
			var socket = clients[identifier];
			if (typeof socket !== "undefined") {
				socket.emit(eventType, req.body);
			}
		});
	}

	res.send("ok");
});


io.on('connection', function(socket){
  console.log('a user connected');
  var identifier;

  socket.on('register', function(data){
  	console.log("registered user with identifier: " + data);
  	identifier = data;
  	clients[identifier] = socket;
  });

  socket.on('disconnect', function(){
    delete clients[identifier];
  });

});
