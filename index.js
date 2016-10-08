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
    .then(createChannelAndExtractUserIds)
    // .then(getUsersCalendars)
    .catch(logError);
}

/**
 * create User Directory Channel and extract User ids
 * @param  {[type]} userResponse [description]
 * @return {[type]}              [description]
 */
function createChannelAndExtractUserIds(userResponse){
  // @TODO: retry creating channel and have a timeout associated with it
  createChannel('userDirectory');
  extractUserIds(userResponse.users)
    .then(createEventsChannel)
    .catch(function(listError) {
      console.log(listError);
    });

}

 // @TODO: Create util library for ancillary functions
/**
 * Log the response
 * @param  {[type]} channelResponse [description]
 * @return {[type]}                 [description]
 */
function logResponse(channelResponse) {
  console.log(channelResponse)
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


function logError(error) {
  console.log(error);
}

function createEventsChannel(userIds) {
  createChannel('events')

}
