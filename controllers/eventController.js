'use strict';

var _                   = require('lodash');
var mongoose            = require('mongoose');
var AdministerCalendars = require('../services/AdministerCalendars');
var ChannelEntry        = mongoose.model('Channel', require('../data/schema/channel'));

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
  getChannelEntry(channelId)
    .then(AdministerCalendars.incrementalSync)
    .then(persistNewSyncToken)
    .then(parseEvents)
    .catch(console.log);
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
  var userId = parseUserIdFromEmail(syncResponse.summary);
  eventList
    .map(function mapEvents(event) {
      // Used these for individual level parsing
      event.pmrUserId = userId;
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
 * Checks the state of the event if it contains WebEx in Location
 * @param  {Object}  event Google event object
 * @return {Boolean}       true if it is; false otherwise
 */
function isWebEx(event) {
  return (event.location.match(/@webex/i)) ? true : false;
}

function confirmEvent(event) {
  if (!event.location) {
    return;
  }

  var needsUpdate = requiresUpdate(event);
  var webExEvent = isWebEx(event);

  if (needsUpdate && webExEvent) {
    updateEvent(event);
  }
}

function requiresUpdate(event) {
  if (!event.description) return true;

  var pmrUrl = createPMRUrl(event);
  var correctPMRUrl = event.description.indexOf(pmrUrl) > -1;
  if (!correctPMRUrl) return true;

  return false;
}

function updateEvent(event) {
  var updateInfo = {
    summary: 'WebEx: ' + event.summary,
    location: event.location,
    end: event.end,
    start: event.start,
    description: buildDescription(event)
  };

  var params = {
    calendarId: event.calendarId,
    eventId: event.id
  };

  AdministerCalendars.updateEvent(params, updateInfo)
    .catch(console.log);
}

function createPMRUrl(event) {
  var getPMRUserId = function getPMRUserId(eventLocation) {
    var containsColon = eventLocation.match(/:/);
    if (containsColon) {
      return eventLocation.match(/\w+[^webex:]\S/)[0];
    }
    return event.pmrUserId;
  };

  var PMRUserId = getPMRUserId(event.location);
  return 'http://cisco.webex.com/meet/' + PMRUserId;
}

function buildDescription(event) {
  var pmrUrl = createPMRUrl(event);
  if (!event.description) {
    return createSignature(pmrUrl);
  }

  // While requiresUpdate prevents webex details with
  // correct urls from passing, we still need to
  // account for details that need updates
  var eventDetailsExist = event.description.indexOf('Generated WebEx Details') > 0;
  if (eventDetailsExist) {
    var OldDetailsStart = event.description.indexOf('=== Do not delete or change any of the following text. ===');
    var newDescription = event.description.substring(0, OldDetailsStart)
                          + createSignature(pmrUrl);
    return newDescription;
  }

  var appendedDescription = event.description + createSignature(pmrUrl);
  return appendedDescription;
}

function createSignature(pmrUrl) {
  var signature = '\n=== Do not delete or change any of the following text. ===';
  signature += '\n=== Generated WebEx Details ===';
  signature += '\nJoin the event creator\'s personal room:';
  signature += '\n' + pmrUrl;

  return signature;
}

function parseUserIdFromEmail(email) {
  // Matches any length of chars before @
  return email.match(/.+?(?=@)/g)[0];
}
