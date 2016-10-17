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
  return new Promise(function(resolve, reject) {
    createJWT(scope.userDirectory)
      .then(function authorizeJwtResponse(jwtClient) {
        var listUsers = Promise.promisify(AdministerUsers.list);

        listUsers(jwtClient, null)
          .then(resolve)
          .catch(reject);
      })
      .catch(logError);
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

/**
 * Create an events channel per each userId
 * @param  {string} userIds <userId>@<domain>
 * @return {void}
 */
function createEventsChannels(userIds) {
  createJWT(scope.calendar)
    .then(function JwtResponse(jwtClient) {
      _.forEach(userIds, function createChannelPerId(userId) {
        // Create a new object appending userId
        var channelInfo = {
          type: 'event',
          id: userId
        };
        createChannel(jwtClient, channelInfo);
      });
    });
}
