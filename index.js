'use strict';

const app = require('express')();
const Promise = require('bluebird');
const _ = require('lodash');
const AdministerUsers = require('./services/AdministerUsers');
const AdministerChannels = require('./services/AdministerChannels');
const config = require('./configs/config');
const db = require('./data/db/connection')('production'); // eslint-disable-line no-unused-vars
let mongoose = require('mongoose');
const Channel = mongoose.model('Channel', require('./data/schema/channel'));
const debug = require('debug')('main');

mongoose.Promise = require('bluebird');

app.get('/', function getResponse(req, res) {
  res.send('Google Calendar Listener is running.');
});

const serverAPI = {
  events: '/watch/events',
  users: '/watch/users'
};

app.use(serverAPI.events, require('./routes/eventsRoute'));
app.use(serverAPI.users, require('./routes/usersRoute'));

initServer();

function initServer() {
  debug('Initiating server');
  removeExpiredChannels();
  setUpChannels();
  app.listen(config.port, debug('Running on port %s', config.port));
}

function setUpChannels() {
  debug('Setting up channels')
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
  debug('Getting directory listing');
  findDirectoryChannel()
    .then(directoryChannel => {
      if (directoryChannel) {
	debug('Current directory exist in DB, setting up future renewal');
        AdministerChannels.renew(directoryChannel);
      } else {
	debug('No existing directory channel found, creating new channel');
        createDirChannelAndSave()
          .then(AdministerChannels.renew);
      }
    });

  extractUserIds(userDirResponse.users)
    .each(function iterateUserIds(userId) {
      const calendarId = userId;
      findEventChannel(calendarId)
        .then(function calendarChannelResponse(eventChannel) {
          if (eventChannel) {
	    debug('Existing channel for %s found, setting up renewal time', calendarId);
            AdministerChannels.renew(eventChannel);
          } else {
	    debug('No existing channel found for %s, creating a new channel', calendarId);
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
  // List of userIds
  return Promise.resolve(_.map(users, user => user.primaryEmail));
}

function createEventChannelAndSave(calendarId) {
  const channelInfo = {
    calendarId: calendarId,
    resourceType: 'event'
  };
  debugger;
  return AdministerChannels.create(channelInfo)
    .then(AdministerChannels.save)
    .catch(console.log);
}

function createDirChannelAndSave() {
  const channelInfo = {
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
  const channels = findNonMatchingExpiredChannel();
  channels
    .remove()
    .then((removed) => (removed.result.n > 0) ?
	  debug(removed.result.n + ' expired documents removed') :
	  debug('No expired documents removed'));
}

function findNonMatchingExpiredChannel() {
  // For the current being, this will remove any non matchinig configured URLs,
  // which limits the application to only handle 1 set desired URL.
  const currentDate = new Date().getTime();

  const query = {
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
