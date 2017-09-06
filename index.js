'use strict';

const express = require('express');
const app = express();
const Promise = require('bluebird');
let _ = require('lodash');
const AdministerUsers = require('./services/AdministerUsers');
const AdministerChannels = require('./services/AdministerChannels');
const AdministerCalendars = require('./services/AdministerCalendars');
const config = require('./configs/config').APP;
let db = require('./data/db/connection')('production'); // eslint-disable-line no-unused-vars
const mongoose = require('mongoose');
let Channel = mongoose.model('Channel', require('./data/schema/channel'));
let calendarEvent = require('./controllers/eventController').observable;
const debug = require('debug')('main');
const requireAll = require('require-all');
const Rx = require('rxjs');
const eventController = require('./controllers/eventController');

mongoose.Promise = require('bluebird');

app.get('/', (req, res) => res.send('Google integration is running.'));

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
  setUpChannels()
    .then(() => {
      loadObservers();
      console.log('Listening to calendars');
    })
    .catch(debug);
  app.listen(config.port, debug('Running on port 5000'));
}

function loadObservers() {
  requireAll({
    dirname:  __dirname + '/observers',
    recursive: true
  });
}

function setUpChannels() {
  return AdministerUsers.list()
    .then(createChannelsAndExtractIds)
}

/**
 * Create User Directory Channel and extract User ids
 * @param  {Object} userDirResponse JSON response for user directory response
 * @return {Void} n/a
 */
function createChannelsAndExtractIds(userDirResponse) {
  findDirectoryChannel()
     // If existing channel exist renew it, otherwise create new and save
    .then(directoryChannel => (directoryChannel) ? directoryChannel : createDirChannelAndSave())
    .then(AdministerChannels.renew)
    .catch(debug);


  extractUserIds(userDirResponse.users)
    .each(calendarId => {
      getEventChannelFromDB(calendarId)
        .then(channelDBEntry => {
          if (channelDBEntry) debug('Found entry for %s', channelDBEntry.calendarId);
          return channelDBEntry;
        })
        .then(eventChannel => (eventChannel) ? renewChannelAndResync(eventChannel) : createNewEventChannel(calendarId));
      })
      .catch(debug);
}

function renewChannelAndResync(eventChannel) {
  debug('Resyncing %s', eventChannel);
  // If the app has stopped, we use the previous syncToken and
  // resync and inform all our observers
  AdministerCalendars
    .incrementalSync(eventChannel)
    .then(syncResp => {
      debug('Incremental sync: %o informing observers', syncResp);
      AdministerCalendars
        .persistNewSyncToken(syncResp)
        .then(() => debug('Updated syncToken during resync'));

      return syncResp;
    })
    .then(syncResponse => eventController.emitEvents(syncResponse))
    .catch((err) => handleInvaldTokenError(err, eventChannel));

  debug('Set renewal for %s', eventChannel);
  AdministerChannels.renew(eventChannel);
  return eventChannel;
}

function handleInvaldTokenError(err, eventChannel) {
  if (err.code === 410) {
    // Perform a full sync and update the syncToken in database
    // and emite any recent events
    debug(err.message);
    const calendarId = eventChannel.calendarId;
    AdministerCalendars
      .fullSync(calendarId)
      .then(AdministerCalendars.persistNewSyncToken)
      .then(syncResp => {
        // Update previous channel with new token and set future renewal and perform resync
        const updatedChannel = Object.assign({}, eventChannel, { nextSyncToken: syncResp.nextSyncToken });
        AdministerChannels.renew(updatedChannel);
        return syncResp;
      })
      .then(syncResponse => eventController.emitEvents(syncResponse));
  } else {
    debug(err.message);
  }
}

function createNewEventChannel(calendarId) {
  return AdministerChannels
    .create({
      calendarId,
      resourceType: 'event'
    })
    .then(AdministerChannels.save)
    .then((r) => { debug('Saved event channel for %s', calendarId); return r})
    .then(AdministerChannels.renew)
    .catch(debug);
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

function createDirChannelAndSave() {
  return AdministerChannels
    .create({
      resourceType: 'directory'
    })
    .then(AdministerChannels.save)
    .catch(debug);
}

function getEventChannelFromDB(calendarId) {
  return Channel.findOne({calendarId: calendarId});
}

function findDirectoryChannel() {
  return Channel.findOne({resourceType: 'directory'});
}

function removeExpiredChannels() {
  let channels = findNonMatchingExpiredChannel();
  channels
    .remove()
    .then(removed => (removed.result.n > 0) ? debug('%s expired documents removed', removed.result.n) : null);
}

function findNonMatchingExpiredChannel() {
  // For the current being, this will remove any non matchinig configured URLs,
  // which limits the application to only handle 1 set desired URL.
  var currentDate = new Date();

  var query = {
    $or: [
      {
        expiration: {
          $lt: currentDate
        }
      },
      {
        webhookUrl: {
          $ne: config.receivingUrl.base
        }
      }
    ]
  };
  return Channel.find(query);
}


