var express       = require('express'),
    path          = require('path'),
    favicon       = require('serve-favicon'),
    logger        = require('morgan'),
    cookieParser  = require('cookie-parser'),
    bodyParser    = require('body-parser'),
    Q             = require('q'),
    nunjucks      = require('nunjucks'),
    http          = require('http');

var ps2ws   = require('./ps2ws.js'),
    teams   = require('./teams.js'),
    routes  = require('./routes/index'),
    users   = require('./routes/users'),
    config  = require('./config'),
    api_key = require('./api_key');
//global variable for use in different functions
var teamOneObject, teamTwoObject;

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', '.html'); // changed from hbs to .html
app.use(express.static(__dirname + '/public')); // code from killfeed.js

app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', routes);
app.use('/users', users);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});

// Killfeed.js code start

app.set('port', 3001);

nunjucks.configure('views', {
  autoescape: true,
  express: app
});

// Render main html
app.get('/', function(req, res) {
  res.render('killfeed', {title: 'Killfeed'});
});

console.log('Starting server...');
var server = http.createServer(app).listen(app.get('port'));
var io = require('socket.io').listen(server);
io.on('connection', function(sock) {
  sock.on('backchat', function (data) {

  });
  sock.on('start', function (data) {
    var event = data.obj;
    if ((event.hasOwnProperty('teamOne')) && (event.hasOwnProperty('teamTwo'))) {
      start(event.teamOne, event.teamTwo);
      console.log(event.teamOne + ' ' + event.teamTwo);
    } else {
      console.error('No data sent: ' + event.teamOne + ' ' + event.teamTwo);
    }
  });
});

console.log('Listening on port %d', server.address().port);

function refreshPage() {
  io.emit('refresh');
}

function killfeedEmit(killfeed) {
  io.emit('killfeed', {obj: killfeed});
}

function sendScores(teamOneObject, teamTwoObject) {
  var scoreboard = {
    teamOne: {
      alias : teamOneObject.alias,
      name : teamOneObject.name,
      points : teamOneObject.points,
      netScore : teamOneObject.netScore,
      kills : teamOneObject.kills,
      deaths : teamOneObject.deaths,
      faction : teamOneObject.faction,
      members : []
    },
    teamTwo: {
      alias : teamTwoObject.alias,
      name : teamTwoObject.name,
      points : teamTwoObject.points,
      netScore : teamTwoObject.netScore,
      kills : teamTwoObject.kills,
      deaths : teamTwoObject.deaths,
      faction : teamTwoObject.faction,
      members : []
    }
  };
  for (keys in teamOneObject.members) {
    scoreboard.teamOne.members.push(teamOneObject.members[keys])
  }
  for (keys in teamTwoObject.members) {
    scoreboard.teamTwo.members.push(teamTwoObject.members[keys])
  }
  io.emit('score', {obj: scoreboard});
}

function playerDataT1 (obj) {
  io.emit('playerDataT1', {obj: obj});
}

function playerDataT2 (obj) {
  io.emit('playerDataT2', {obj: obj});
}

function timerEmit (obj) {
  io.emit('time', {obj: obj});
}


function start(one, two) {
  var teamOneTag = one,
      teamTwoTag = two;
  var response = Q.defer();
  var promises = [];
  promises.push(teams.fetchTeamData(teamOneTag));
  promises.push(teams.fetchTeamData(teamTwoTag));
  Q.allSettled(promises).then(function (results) {
    if (config.DEBUG) {
      console.log('T1 - ' + config.debug.team1);
      console.log('T2 - ' + config.debug.team2);
      teamOneObject = JSON.parse(config.debug.team1);
      teamTwoObject = JSON.parse(config.debug.team2);
    } else {
      console.log('T1 - ' + JSON.stringify(results[0].value));
      console.log('T2 - ' + JSON.stringify(results[1].value));
      teamOneObject = results[0].value;
      teamTwoObject = results[1].value;
    }
    ps2ws.startUp(teamOneObject, teamTwoObject);
    return response.promise;
  });
}

module.exports        = app;
exports.killfeedEmit  = killfeedEmit;
exports.sendScores    = sendScores;
exports.refreshPage   = refreshPage;
exports.playerDataT1  = playerDataT1;
exports.playerDataT2  = playerDataT2;
exports.timerEmit     = timerEmit;
