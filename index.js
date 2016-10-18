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

app.use('/watch/events', require('./routes/eventsRoute'));

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
  setUpChannels();
  app.listen(config.port, console.log('Running on port 5000'));
}

/**
 * Set up all the events and userDirectory channels
 * @return {void}
 */
function setUpChannels() {
  getUsers()
    .then(createUserChannelsAndExtractIds)
    .catch(logError);
}

/**
 * create User Directory Channel and extract User ids
 * @param  {[type]} userResponse [description]
 * @return {[type]}              [description]
 */
function createUserChannelsAndExtractIds(userResponse) {
  // @TODO: retry creating channel and have a timeout associated with it
  createDirectoryChannel();
  extractUserIds(userResponse.users)
    .then(createEventsChannels)
    .catch(logError);
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
* @param  {array} users an array of users from the Google directory response
* @return {object}       returns an extracted list of Google user ids
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
 * Create an events watch channel per each userId
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

/**
 * Creates an directory watch channel
 * @return {void}
 */
function createDirectoryChannel() {
  createJWT(scope.userDirectory)
    .then(function JwtResponse(jwtClient) {
      var channelInfo = {
        type: 'directory'
      };
      createChannel(jwtClient, channelInfo);
    });
}
