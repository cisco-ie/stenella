'use strict';

const express = require('express');
const express = express();
var Promise = require('bluebird');
var _ = require('lodash');
var AdministerUsers = require('./services/AdministerUsers');
var AdministerChannels = require('./services/AdministerChannels');
var config = require('./configs/config');
var db = require('./data/db/connection')('production'); // eslint-disable-line no-unused-vars
var mongoose = require('mongoose');
var Channel = mongoose.model('Channel', require('./data/schema/channel'));
mongoose.Promise = require('bluebird');

app.get('/', function getResponse(req, res) {
  res.send('Google integration is running.');
});

// This is used to allow drop-in html files for Google verification
app.use('/', express.static(__dirname + '/verify'));

var serverAPI = {
  events: '/watch/events',
  users: '/watch/users'
};

app.use(serverAPI.events, require('./routes/eventsRoute'));
app.use(serverAPI.users, require('./routes/usersRoute'));

initServer();

function initServer() {
  removeExpiredChannels();
  setUpChannels();
  app.listen(config.port, console.log('Running on port 5000'));
}

function setUpChannels() {
  AdministerUsers.list()
    .then(createChannelsAndExtractIds)
    .catch(console.log);
}

/**
 * Create User Directory Channel and extract User ids
 * @param  {Object} userDirResponse JSON response for user directory response
 * @return {Void} n/a
 */
function createChannelsAndExtractIds(userDirResponse) {
  findDirectoryChannel()
    .then(function findDirCb(directoryChannel) {
      if (directoryChannel) {
        AdministerChannels.renew(directoryChannel);
      } else {
        createDirChannelAndSave()
          .then(AdministerChannels.renew);
      }
    });

  extractUserIds(userDirResponse.users)
    .each(function iterateUserIds(userId) {
      var calendarId = userId;
      findEventChannel(calendarId)
        .then(function calendarChannelResponse(eventChannel) {
          if (eventChannel) {
            AdministerChannels.renew(eventChannel);
          } else {
            createEventChannelAndSave(userId)
              .then(AdministerChannels.renew);
          }
        });
    })
    .catch(console.log);
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
    .catch(console.log);
}

function createDirChannelAndSave() {
  var channelInfo = {
    resourceType: 'directory'
  };

  return AdministerChannels.create(channelInfo)
    .then(AdministerChannels.save)
    .catch(console.log);
}

function findEventChannel(calendarId) {
  return Channel.findOne({calendarId: calendarId});
}

function findDirectoryChannel() {
  return Channel.findOne({resourceType: 'directory'});
}

function removeExpiredChannels() {
  var channels = findNonMatchingExpiredChannel();
  channels
    .remove()
    .then(function successExpiredRemoval(removed) {
      if (removed.result.n > 0) {
        console.log(removed.result.n + ' expired documents removed');
      }
    });
}

function findNonMatchingExpiredChannel() {
  // For the current being, this will remove any non matchinig configured URLs,
  // which limits the application to only handle 1 set desired URL.
  var currentDate = new Date().getTime();

  var query = {
    $or: [
      {
        expiration: {
          $lt: currentDate
        }
      },
      {
        webhookUrl: {
          $ne: config.webhookUrl
        }
      }
    ]
  };
  return Channel.find(query);
}


