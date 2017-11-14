var VERSION = "1.1.5";

// Requirements
var express = require('express');
var bodyParser = require('body-parser');
var Raven = require('raven');
Raven.config('https://f7b80b35d87c43aa8f610d52cefa3ec2:cdc5a817f2be49f0a97e41c30f6ed8d4@sentry.io/240765').install();

// App initialization
var app = express();

var jsonParser = bodyParser.json({limit: '50mb'});
app.use(jsonParser);

// Server initialization
var server = require('http').Server(app);

app.use(Raven.requestHandler());

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

app.use(Raven.errorHandler());
