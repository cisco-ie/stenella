'use strict';

var app = require('express')();
var Promise = require('bluebird');
var async = require('async');
var _ = require('lodash');
var AdministerUsers = require('./services/AdministerUsers');
var AdministerChannels = require('./services/AdministerChannels');
var AdministerCalendars = require('./services/AdministerCalendars');
var createJWT = require('./services/AdministerJWT').createJWT;
var config = require('./configs/config');
var scope = require('./constants/GoogleScopes');
var logError = require('./libs/errorHandlers').logError;
var db = require('./data/db/connection');
var mongoose = require('mongoose');

app.get('/', function getResponse(req, res) {
  res.send('Google integration is running.');
});

var serverAPI = {
  events: '/watch/events',
  users: '/watch/users'
};

app.use(serverAPI.events, require('./routes/eventsRoute'));
// TODO: Add users
// app.use(serverAPI.users, require('./routes/watchRoute'));

initServer();

function initServer() {
  setUpChannels();
  app.listen(config.port, console.log('Running on port 5000'));
}

function setUpChannels() {
  getUsers()
    .then(createUserChannelsAndExtractIds)
    .catch(logError);
}

/**
 * Create User Directory Channel and extract User ids
 * @param  {Object} userResponse JSON response for user directory response
 * @return {Void}
 */
function createUserChannelsAndExtractIds(userDirResponse) {
  // @TODO:
  // retry creating channel and have a timeout associated with it
  createDirectoryChannel()
    .then(AdministerChannels.save)
    .catch(logError);

  extractUserIds(userDirResponse.users)
    // This a series of request per each id
    .each(createEventChannelsAndSave)
    .catch(logError);
}

/**
 * Get list of users
 * @return {Object} A promise when fulfilled is
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
* Get list of user ids from user records
* @param  {Array} users an array of users from the Google directory response
* @return {Object}       returns an extracted list of Google user ids
*/
function extractUserIds(users) {
  var userIds = _.map(users, function extractEmail(user) {
    return user.primaryEmail;
  });
  return Promise.resolve(userIds);
}

/**
 * Performs a channel request and saves after successful
 * @param  {String} userId UserId of the eventList to create a watch for
 * @return {String}
 */
function createEventChannelsAndSave(userId) {
  var eventChannelPromise = createEventChannel(userId);
  var syncTokenPromise = AdministerCalendars.getSyncToken(userId);

  Promise.all([
    syncTokenPromise,
    eventChannelPromise,
  ])
  .spread(function(syncToken, channelInfo) {
    channelInfo.syncToken = syncToken;
    AdministerChannels.save(channelInfo);
    // @TODO: this could be abstracted within the service
  })
  .catch(logError);
}

/**
 * Create an events watch channel per each userId
 * @param  {String} userIds <userId>@<domain>
 * @return {Void}
 */
function createEventChannel(userId) {
  var channelInfo = {
    type: 'event',
    id: userId
  };
  return AdministerChannels.create(channelInfo);
}

function createDirectoryChannel() {
  var channelInfo = {
    type: 'directory'
  };
  return AdministerChannels.create(channelInfo);
}
