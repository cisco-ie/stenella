'use strict';

/**
 * Variable Declarations
 */

var express = require('express');
var Promise = require('bluebird');
var AdministerUsers = require('./services/AdministerUsers');

var config = require('./configs/config');
var scope = require('./constants/GoogleScopes');
var google = require('googleapis');

// var initialize = Promise.promisify(require('express-init'));
// var app = express();
// initialize(app).then(setupCalendaring);

var app = express();
var initialize = require('express-init');

var middleware = function (req, res, next) {
  // ... the stuff dreams are made of
  next()
};

middleware.init = function(app, callback) {
  // initialize your middleware and callback when ready
  callback();
};

var app = express();
app.use(middleware);
app.get('/', function(req, res) {
  req.send('ok');
});
initialize(app, function(err, result) {
  setupCalendaring();
  app.listen(5000);
})

/**
 * This function setups subscriptions for user directories, calendarList and Events
 */
function setupCalendaring() {
  retrieveUserList()
  // retrieveCalendarList()
  // createCalendarChannel()
}

function retrieveUserList() {
  var key = config.keys.server;

  var jwtClient = new google.auth.JWT(key.client_email, null, key.private_key, [scope.userDirectory], null);

  jwtClient.authorize(function(err, tokens) {
    if (err) {
      console.log(err);
      return;
    }
    AdministerUsers.list(jwtClient,null,function(error, result){
      console.log(error);
    });
  });


}
