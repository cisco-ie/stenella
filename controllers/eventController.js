'use strict';

var _                   = require('lodash');
var mongoose            = require('mongoose');
var AdministerCalendars = require('../services/AdministerCalendars');
var ChannelEntry        = mongoose.model('Channel', require('../data/schema/channel'));


//var SEARCH_PATTERN       = /searchPattern/i;
//var OVERRIDE_PATTERN    = /searchPattern:/i;

mongoose.Promise = require('bluebird');

var Interface = {
  load: load
};

module.exports = Interface;

/**
 * Loading to the controller based on Channel Id
 * @param  {String} channelId Channel Id recieved from the notification
 * @return {Void} None
 */
function load(channelId) {
  getChannelEntry(channelId).then(function(channelEntry) {
    if (!channelEntry) { return; }

    AdministerCalendars.incrementalSync(channelEntry)
      .then(persistNewSyncToken)
      .then(parseEvents)
      .catch(console.log);
  });
}

/**
 * Returns the Channel Entry from Database
 * @param  {String} channelId string of channel entry
 * @return {Object}           Mongoose Virtual Model of Channel Entry
 */
function getChannelEntry(channelId) {
  return ChannelEntry.findOne({ channelId: channelId });
}

function parseEvents(syncResponse) {
  // Event list is order sensitive
  var eventList = _(syncResponse.items);
  eventList
    .map(function mapEvents(event) {
      // Used these for individual level parsing
      event.calendarId = syncResponse.summary;
      return event;
    })
    .forEach(eventFactory);
}

/**
 * Updates the token, but also passes along the response to the chain
 * @param  {Object} syncResponse Incremental sync JSON response
 * @return {Object}              Returns the response out to continue the chain
 */
function persistNewSyncToken(syncResponse) {
  var query = {
    calendarId: syncResponse.summary
  };
  var update = {
    syncToken: syncResponse.nextSyncToken
  };

  return ChannelEntry.update(query, update)
    .exec()
    .then(function updateResponse() {
      return syncResponse;
    });
}

// This is logic redirect
// based on the event status
function eventFactory(event) {
  if (!event) throw new Error('No event object inputted');
  var mapFunctions = {
    cancelled: cancelEvent,
    confirmed: confirmEvent
  };
  return mapFunctions[event.status](event);
}

function cancelEvent() {
  return;
}

/**
 * Checks the state of the event if it contains pattern to match in Location
 * @param  {Object}  event Google event object
 * @return {Boolean}       true if it is; false otherwise
 */
function isMatching(event) {
  return (event.location.match()) ? true : false;
}

function confirmEvent(event) {
  if (!event.location) {
    return;
  }

  var needsUpdate = requiresUpdate(event);
  var matchEvent = isMatching(event);

  if (needsUpdate && matchEvent) {
    updateEvent(event);
  }
}

function requiresUpdate(event) {
  if (!event.description) return true;
  // @TBD: Webhook calendar event update
  return false;
}

function updateEvent(event) {
// Build the webhook that occurs on updateEvent

  var params = {
    calendarId: event.calendarId,
    eventId: event.id
  };

  var updateInfo = {};

  AdministerCalendars.updateEvent(params, updateInfo)
    .catch(console.log);
}
