'use strict';

/**
 * Variable Declarations
 */
var app = require('express')();
var Promise = require('bluebird');
var _ = require('lodash');

var AdministerUsers = require('./services/AdministerUsers');
var AdministerCalendars = require('./services/AdministerCalendars');

var config = require('./configs/config');
var scope = require('./constants/GoogleScopes');
var key = config.keys.server;
var google = require('googleapis');

/**
 * Application Index Route
 */
app.get('/', function getResponse(req, res) {
  res.send('Google Integration is running.');
});

/**
 * Initialization of server
 */
init();

/**
 * A promise that performs synchronous operations to setup the
 * server prior to accepting requests
 * @return {object} Promise which is resolved once all operations are done
 */
function init() {
  setupCalendaring();
  app.listen(config.port, console.log('Running on port 5000'));
}

function setupCalendaring() {
  getUsers()
    .then(extractUserId)
    .then(getUsersCalendars)
    .catch(logError);
}

/**
 * get list of users
 * @return {object} A promise when fulfilled is
 */
function getUsers() {
  var jwtClient = new google.auth.JWT(key.client_email, null, key.private_key, scope.userDirectory, config.authorizeAdmin);
  /**
   * @TODO: make promise compliant
   */
  // var authorizeClient = Promise.promisify(jwtClient.authorize);
  return new Promise(function(resolve, reject) {
    jwtClient.authorize(function(error, tokens) {
      if (error) reject(error);
      var listUsers = Promise.promisify(AdministerUsers.list);

      listUsers(jwtClient, null)
        .then(function(response) {
          resolve(response.users);
        })
        .catch(function(listError) {
          reject(listError);
        });
    });
  });
}

/**
* get list of user ids from user records
* @param  {[type]} users [description]
* @return {[type]}       [description]
*/
function extractUserId(users) {
  var userIds = _.map(users, function(user) {
    return user.primaryEmail;
  });

  return Promise.resolve(userIds);
}

/**
 * get calendars for all user ids
 * @param  {[type]} usersIds [description]
 * @return {[type]}          [description]
 */
function getUsersCalendars(usersIds) {
  var jwtClient = new google.auth.JWT(key.client_email, null, key.private_key, scope.calendar, config.authorizeAdmin);

  jwtClient.authorize(function(error) {
    _.forEach(usersIds, function(userId) {
      AdministerCalendars.list(jwtClient, null, userId, function(listErr, result) {
        console.log(result);
      });
    });
  });
}

function logError(error) {
  console.log(error);
}
