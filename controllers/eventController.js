'use strict';

/**
 * Variable Declarations
 */
var logError = require('../libs/errorHandlers').logError;
var Promise = require('bluebird');
var channelSchema = require('../data/schema/channel');
var mongoose = require('mongoose');
var channel = mongoose.model('Channel', channelSchema);
var createJWT = require('../services/AdministerJWT').createJWT;
var scopes = require('../constants/GoogleScopes');

mongoose.Promise = require('bluebird');

/**
 * Events Controller Interface
 * @type {Object}
 */
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
    .then(getIncrementalSync)
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
  return Channel.findOne({ channelId: channelId }).exec();
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


function persistNewSyncToken (syncResponse) {
  var query = {
    calendarId: syncResponse.summary
  };
  var update = {
    syncToken: syncResponse.nextSyncToken
  };
  return Subscription.update(query, update)
    .exec()
    .then(function (success) {
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
  var details = WebExService.doesDetailsExist(event.description);
  if (!details) return;
  Event
    .findOne({ id: event.id })
    .then(deleteMeeting);
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
    var webExDetails = WebExService.doesDetailsExist(event.description);
    var header = WebExService.buildHeaderObj();
    var calendarClient = GoogleAuthService.getJwtClient(scopes.calendar);
    var bodyParams = {
      name: event.summary,
      startTime: event.start.dateTime,
      endTime: event.end.dateTime,
      password: Math.random().toString(36).substr(2, 9),
      attendees: event.attendees,
      xsiType: 'java:com.webex.service.binding.meeting.CreateMeeting'
    };
  }
}
