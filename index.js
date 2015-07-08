// Requirements
var express = require('express');
var bodyParser = require('body-parser');

// App initialization
var app = express();
var jsonParser = bodyParser.json();
app.use(jsonParser);

// Server initialization
var server = require('http').Server(app);
server.listen(8081, function(){
  console.log('listening on *:8081');
});

// Initializing libraries
require('./websockets.js').init(server, app);
require('./apns.js')(app);
require('./gcm.js')(app);

// Routes
app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

