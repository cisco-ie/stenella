'use strict';

/**
 * Variable Declarations
 */

var express = require('express');
var Promise = require('bluebird');
var _ = require('lodash');
var AdministerUsers = require('./services/AdministerUsers');
var AdministerCalendars = require('./services/AdministerCalendars');

var config = require('./configs/config');
var scope = require('./constants/GoogleScopes');
var google = require('googleapis');

// var initialize = Promise.promisify(require('express-init'));
// var app = express();
// initialize(app).then(setupCalendaring);

var app = express();
var initialize = require('express-init');

var middleware = function(req, res, next) {
  // ... the stuff dreams are made of
  next();
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
});

/**
 * This function setups subscriptions for user directories, calendarList and Events
 */
function setupCalendaring() {
  retrieveUserList();
  // createCalendarChannel()
}

function retrieveUserList() {
  var key = config.keys.server;
  var jwtClient = new google.auth.JWT(key.client_email, null, key.private_key, scope.userDirectory, config.authorizeAdmin);
/**
 * @TODO: make promise compliant
 */
  // var authorizeClient = Promise.promisify(jwtClient.authorize);

  // return authorizeClient
  //   .then(getUsers)
  //   .then(extractUserId);
    // .catch(logError);
  jwtClient.authorize(function(err, result) {
    if (err) {
      console.log(err);
    }
    console.log(result);
    getUsers()
      .then(function(response) {
        // console.log(response);
        var usersIds = extractUserId(response.users);
        console.log("**************");
        console.log(usersIds);

        getUsersCalendars(usersIds);
      });
  });

/**
 * get list of users
 * @return {[type]} [description]
 */
  function getUsers() {
    var listUsers = Promise.promisify(AdministerUsers.list);
    return listUsers(jwtClient, null);
  }

/**
 * get list of user ids from user records
 * @param  {[type]} users [description]
 * @return {[type]}       [description]
 */
  function extractUserId(users) {
    // console.log(users);
    return _.map(users, function(user) {
      return user.primaryEmail;
    });
  }

/**
 * get calendars for all user ids
 * @param  {[type]} usersIds [description]
 * @return {[type]}          [description]
 */
  function getUsersCalendars(usersIds) {
    var jwtClient = new google.auth.JWT(key.client_email, null, key.private_key, scope.calendar, config.authorizeAdmin);

    jwtClient.authorize(function(err, result) {
      _.forEach(usersIds, function(userId) {
          AdministerCalendars.list(jwtClient, null, userId, function(err, result) {
            console.log(result);
          })
      });
    })
  }
}
