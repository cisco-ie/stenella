'use strict';

/**
 * Variable Declarations
 */
var app = require('express')();
var Promise = require('bluebird');
var _ = require('lodash');
var AdministerUsers = require('./services/AdministerUsers');
var createChannel = require('./services/AdministerChannels').createChannel;
var createJWT = require('./services/AdministerJWT').createJWT;
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
    .catch(logError);
}

/**
 * create User Directory Channel and extract User ids
 * @param  {[type]} userResponse [description]
 * @return {[type]}              [description]
 */
function createChannelAndExtractUserIds(userResponse) {
  // @TODO: retry creating channel and have a timeout associated with it
  // createChannel('userDirectory');
  extractUserIds(userResponse.users)
    .then(createEventsChannels)
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
  return new Promise(function(resolve, reject) {
    jwtClient.authorize(function(error) {
      if (error) reject(error);
      var listUsers = Promise.promisify(AdministerUsers.list);

      listUsers(jwtClient, null)
        .then(function(response) {
          resolve(response);
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
function extractUserIds(users) {
  var userIds = _.map(users, function extractEmail(user) {
    return user.primaryEmail;
  });
  return Promise.resolve(userIds);
}

function logError(error) {
  console.log(error);
}

function createEventsChannels(userIds) {
  var channelInfo = {
    type: 'event'
  };
  createJWT(scope.calendar)
    .then(function JwtResponse(jwtClient) {
      _.forEach(userIds, function createChannelPerId(userId) {
        channelInfo.id = userId;
        createChannel(jwtClient, channelInfo);
      });
    });
}
