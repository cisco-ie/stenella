'use strict';

/**
 * Variable Declarations
 */
var app = require('express')();
var Promise = require('bluebird');
var _ = require('lodash');
var AdministerUsers = require('./services/AdministerUsers');
var AdministerChannels = require('./services/AdministerChannels');
var createJWT = require('./services/AdministerJWT').createJWT;
var config = require('./configs/config');
var scope = require('./constants/GoogleScopes');
var logError = require('./libs/errorHandlers').logError;

/**
 * Application Index Route
 */
app.get('/', function getResponse(req, res) {
  res.send('Google Integration is running.');
});

/**
 * Application Defined Routes
 * @type {Object}
 */
var serverAPI = {
  events: '/watch/events',
  users: '/watch/users'
};

/**
 * Application Middleware
 * and Route configuration
 */
app.use(serverAPI.events, require('./routes/eventsRoute'));
// app.use(serverAPI.users, require('./routes/watchRoute'));

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
  createDirectoryChannel()
    .then(AdministerChannels.save);

  extractUserIds(userResponse.users)
    .then(createEventsChannels)
    .then(AdministerChannels.save)
    .catch(logError);
}

/**
 * get list of users
 * @return {object} A promise when fulfilled is
 */
function getUsers() {
  return new Promise(function userPromise(resolve, reject) {
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

/**
 * Create an events watch channel per each userId
 * @param  {string} userIds <userId>@<domain>
 * @return {void}
 */
function createEventsChannels(userIds) {
  _.forEach(userIds, function createChannelPerId(userId) {
    // Create a new object appending userId
    var channelInfo = {
      type: 'event',
      id: userId
    };

    console.log(channelInfo);
    return AdministerChannels.create(channelInfo);
  });
}

/**
 * Creates an directory watch channel
 * @return {void}
 */
function createDirectoryChannel() {
  var channelInfo = {
    type: 'directory'
  };
  return AdministerChannels.create(channelInfo);
}
