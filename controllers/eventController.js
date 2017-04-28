'use strict';

var _                   = require('lodash');
var mongoose            = require('mongoose');
var AdministerCalendars = require('../services/AdministerCalendars');
var ChannelEntry        = mongoose.model('Channel', require('../data/schema/channel'));
const EventEmitter = require('events');
const Rx = require('rxjs');
var WEBEX_URL           = require('../configs/config').webExDomain;
var WEBEX_PATTERN       = /@webex/i;
var OVERRIDE_PATTERN    = /@webex:/i;

mongoose.Promise = require('bluebird');

class CalendarEmitter extends EventEmitter {}

const calendarEmitter = new CalendarEmitter();

var Interface = {
  load: load,
  observable: Rx.Observable.fromEvent(calendarEmitter, 'CALENDAR_UPDATE').flatMap().share(),
  _filterForLatestEvents,
  _parseUserIdFromEmail
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
  // Filter events for any duplicates and just get the latest one
  var eventList = syncResponse.items
      .filter(_filterForLatestEvents);
  var userId = _parseUserIdFromEmail(syncResponse.summary);
  const updates = syncResponse.items.map(event => {
    event.calendarId = syncResponse.summary;
    event.userId = userId;

    // Provide a default payload to help users
    // update only what they need, but leave the required
    // properties for the user
    let defaultPayload = {
      summary: event.summary,
      location: event.location,
      end: event.end,
      start: event.start,
      description: event.description,
      attendees: event.attendees,
      attachments: event.attachments,
      reminders: event.reminders
    };

    return [event, defaultPayload];
  });

  calendarEmitter.emit('CALENDAR_UPDATE', updates);
}

// Looks through the list to find any matching event
// previously
// _filterForLatestEvent :: (Element, Index, Array) -> Boolean
function _filterForLatestEvents(currentEvent, currentIndex, list) {
  const mostRecentIndex = _.findIndex(list, (e) => e.id === currentEvent.id);
  // If the current item index is equal or less than the most recentIndex, keep it (true)
  return (currentIndex <= mostRecentIndex) ? true : false;
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
    .then(() => syncResponse);
}

// // This is logic redirect
// // based on the event status
// function eventFactory(calendarEvent) {
//   if (!calendarEvent) throw new Error('No event object inputted');
//   var mapFunctions = {
//     cancelled: () => calendarEmitter.event('CANCELLED_EVENT', calendarEvent),
//     confirmed: () => calendarEmmitter.event('NEW_EVENT', calendarEvent)
//   };
//   return mapFunctions[event.status](event);
//}

// function cancelEvent(calendarEvent) {
//   // Emit a deleted calendar event
//   calendarEmitter.emit('DELETE_EVENT', calendarEvent);
//   return;
// }

// /**
//  * Checks the state of the event if it contains WebEx in Location
//  * @param  {Object}  event Google event object
//  * @return {Boolean}       true if it is; false otherwise
//  */
// function isWebEx(event) {
//   return (event.location.match(WEBEX_PATTERN)) ? true : false;
// }

// function confirmEvent(event) {
// }

// function requiresUpdate(event) {
//   if (!event.description) return true;

//   var pmrUrl = createPMRUrl(event);
//   var correctPMRUrl = event.description.indexOf(pmrUrl) > -1;
//   if (!correctPMRUrl) return true;

//   return false;
// }

// function updateEvent(event) {
//   var updateInfo = {
//     summary: buildSummary(event.summary),
//     location: event.location,
//     end: event.end,
//     start: event.start,
//     description: buildDescription(event),
//     attendees: event.attendees || []
//   };

//   var params = {
//     calendarId: event.calendarId,
//     eventId: event.id
//   };

//   AdministerCalendars.updateEvent(params, updateInfo)
//     .catch(console.log);
// }

// function buildSummary(existingSummary) {
//   if (typeof existingSummary !== 'string') return '';

//   if (existingSummary.match(/webex:/i)) {
//     return existingSummary;
//   }

//   return 'WebEx: ' + existingSummary;
// }

// function createPMRUrl(event) {
//   var pmrUserId = event.pmrUserId;
//   var webexCMRUrl = getAltWebExCMR(event.location);

//   function getAltWebExCMR(location) {
//     var overrideFlagIndex = location.search(OVERRIDE_PATTERN);
//     // Return owner of event as the default user, if no
//     // override flag is present
//     if (overrideFlagIndex === -1) return WEBEX_URL;

//     var webExString = location.substring(overrideFlagIndex, location.length);
//     // First match will always be /webex/i
//     var newCMR = webExString.match(/\w+/g)[1];
//     // Extract the domain and replace it with the newdomain specified in
//     // the @webex:newdomain on the UI
//     var cmrBase = /[^.]+/.exec(WEBEX_URL)[0].substr(7);
//     var newCMRUrl = WEBEX_URL.replace(cmrBase, newCMR);
//     return newCMRUrl;
//   }

//   return webexCMRUrl + 'meet/' + pmrUserId;
// }

// function buildDescription(event) {
//   var pmrUrl = createPMRUrl(event);
//   if (!event.description) {
//     return createSignature(pmrUrl);
//   }

//   // While requiresUpdate prevents webex details with
//   // correct urls from passing, we still need to
//   // account for details that need updates
//   var eventDetailsExist = event.description.indexOf('Generated WebEx Details') > 0;
//   if (eventDetailsExist) {
//     var OldDetailsStart = event.description.indexOf('=== Do not delete or change any of the following text. ===');
//     var newDescription = event.description.substring(0, OldDetailsStart)
//                           + createSignature(pmrUrl);
//     return newDescription;
//   }

//   var appendedDescription = event.description + createSignature(pmrUrl);
//   return appendedDescription;
// }

// function createSignature(pmrUrl) {
//   var signature = '\n=== Do not delete or change any of the following text. ===';
//   signature += '\n=== Generated WebEx Details ===';
//   signature += '\nJoin the event creator\'s personal room:';
//   signature += '\n' + pmrUrl;

//   return signature;
// }

function _parseUserIdFromEmail(email) {
  if (typeof email !== 'string') {
    throw new Error('Email is not a string');
  }

  return email.match(/.+?(?=@)/g)[0];
}
