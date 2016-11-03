'use strict';

var app = require('express')();
var Promise = require('bluebird');
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
var Channel = mongoose.model('Channel', require('./data/schema/channel'));

app.get('/', function getResponse(req, res) {
  res.send('Google integration is running.');
});

var serverAPI = {
  events: '/watch/events',
  users: '/watch/users'
};

app.use(serverAPI.events, require('./routes/eventsRoute'));
app.use(serverAPI.users, require('./routes/usersRoute'));

initServer();

function initServer() {
  setUpChannels();
  app.listen(config.port, console.log('Running on port 5000'));
}

function setUpChannels() {
  getUsers()
    .then(createChannelsAndExtractIds)
    .catch(logError);
}

/**
 * Create User Directory Channel and extract User ids
 * @param  {Object} userResponse JSON response for user directory response
 * @return {Void}
 */
function createChannelsAndExtractIds(userDirResponse) {
  findDirectoryChannel()
    .then(function findDirCb(directoryChannel) {
      if (directoryChannel)
        return AdministerChannels.renew(directoryChannel);

      createDirChannelAndSave()
        .then(AdministerChannels.renew);
    });

  extractUserIds(userDirResponse.users)
    .each(function (userId) {
      var calendarId = userId;
      findCalendarChannel(calendarId)
        .then(function(eventChannel) {
          if (eventChannel)
            return AdministerChannels.renew(eventChannel);

          createEventChannelAndSave(userId)
            .then(AdministerChannels.renew);
        });
    })
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

function createEventChannelAndSave(calendarId) {
  var channelInfo = {
    calendarId: calendarId,
    resourceType: 'event'
  };

  return AdministerChannels.create(channelInfo)
    .then(AdministerChannels.save)
    .catch(logError);
}

function createDirChannelAndSave() {
  var channelInfo = {
    resourceType: 'directory'
  };

  return AdministerChannels.create(channelInfo)
    .then(AdministerChannels.save)
    .catch(logError);
}

function findCalendarChannel(calendarId) {
  return Channel.findOne({calendarId: calendarId});
}

function findDirectoryChannel() {
  return Channel.findOne({resourceType: 'directory'});
}


