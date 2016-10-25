'use strict';

var _ = require('lodash');
var logError = require('../libs/errorHandlers').logError;
var Promise = require('bluebird');
var channelSchema = require('../data/schema/channel');
var mongoose = require('mongoose');
var channel = mongoose.model('Channel', channelSchema);
var createJWT = require('../services/AdministerJWT').createJWT;
var scopes = require('../constants/GoogleScopes');
var AdministerCalendars = require('../services/AdministerCalendars');
var ChannelEntry = mongoose.model('Channel', require('../data/schema/channel'));

mongoose.Promise = require('bluebird');

var Interface = {
  load: load
};

module.exports = Interface;

/**
 * Loading to the controller based on Channel Id
 * @param  {String} channelId Channel Id recieved from the notification
 * @return {Void}
 */
function load(channelId) {
  getChannelEntry(channelId)
    .then(AdministerCalendars.incrementalSync)
    .then(persistNewSyncToken)
    .then(parseEvents)
    .catch(logError);
}

/**
 * Returns the Channel Entry from Database
 * @param  {String} channelId string of channel entry
 * @return {Object}           Mongoose Virtual Model of Channel Entry
 */
function getChannelEntry(channelId) {
  return ChannelEntry.findOne({ channelId: channelId });
}

/**
 * Performs an incremental sync of the event list
 * @param  {Object} channelEntry Channel Database Entry
 * @return {Arrray}              List of Events
 */
function getIncrementalSync (channelEntry) {
  // a null entry = an old channelId that hasn't fully expired
  if (!channelEntry) throw new Error('channelId has been replaced with a newer channelId');
  return createJWT(scopes.calendar)
    .then(function jwtResponse(jwtClient) {
      var eventListParams = {
        id: channelEntry.resourceId,
        syncToken: channelEntry.syncToken
      };

      return getEventList(jwtClient, eventListParams);
    });
}

/**
 * [parseEvents description]
 * @param  {[type]} syncResponse [description]
 * @return {[type]}              [description]
 */
function parseEvents (syncResponse) {
  // Event list is order sensitive
  var eventList = _(syncResponse.items);
  eventList
    .forEach(eventFactory)
}

/**
 * Updates the token, but also passes along the response to the chain
 * @param  {Object} syncResponse Incremental sync JSON response
 * @return {Object}              Returns the response out to continue the chain
 */
function persistNewSyncToken (syncResponse) {
  var query = {
    calendarId: syncResponse.summary
  };
  var update = {
    syncToken: syncResponse.nextSyncToken
  };

  return ChannelEntry.update(query, update)
    .exec()
    .then(function (success) {
      console.log(success);
      return syncResponse;
    });
};

// This is logic redirect
// based on the event status
function eventFactory (event) {
  if (!event) return;
  return {
    cancelled: cancelEvent,
    confirmed: confirmEvent
  }[event.status](event);
}

function cancelEvent (event) {
  return;
  // Currently no longer used
  // var details = WebExService.doesDetailsExist(event.description);
  // if (!details) return;
  // Event
  //   .findOne({ id: event.id })
  //   .then(deleteMeeting);
}

/**
 * Checks the state of the event if it contains WebEx in Location
 * @param  {Object}  event Google event object
 * @return {Boolean}       true if it is; false otherwise
 */
function isWebEx(event) {
  if (!event.location) return false;
  return event.location.match(/@webex/i);
}

function confirmEvent(event) {
  if (isWebEx(event)) {
    console.log(event);
  }
}
