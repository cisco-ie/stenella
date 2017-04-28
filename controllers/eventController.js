'use strict';

var _                   = require('lodash');
var mongoose            = require('mongoose');
var AdministerCalendars = require('../services/AdministerCalendars');
var ChannelEntry        = mongoose.model('Channel', require('../data/schema/channel'));
const EventEmitter = require('events');
const Rx = require('rxjs');

mongoose.Promise = require('bluebird');

class CalendarEmitter extends EventEmitter {}
const calendarEmitter = new CalendarEmitter();

var Interface = {
  load: load,
  // [ Event1, Event2 ] => Observable.of(Event1)-->Observable.of(Event2)
  observable: Rx.Observable.fromEvent(calendarEmitter, 'CALENDAR_UPDATE').flatMap(x => x).share(),
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
  const updates = eventList.map(event => {
    event.calendarId = syncResponse.summary;
    event.userId = userId;
    return event;
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

function _parseUserIdFromEmail(email) {
  if (typeof email !== 'string') {
    throw new Error('Email is not a string');
  }

  return email.match(/.+?(?=@)/g)[0];
}
