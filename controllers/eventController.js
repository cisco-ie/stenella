'use strict';

var _                   = require('lodash');
var mongoose            = require('mongoose');
var AdministerCalendars = require('../services/AdministerCalendars');
var ChannelEntry        = mongoose.model('Channel', require('../data/schema/channel'));
const EventEmitter = require('events');
const Rx = require('rxjs');
const debug = require('debug')('eventController');

mongoose.Promise = require('bluebird');

class CalendarEmitter extends EventEmitter {}
const calendarEmitter = new CalendarEmitter();

let Interface = {
  load,
  emitEvents,
  // [ Event1, Event2 ] => Observable.of(Event1)-->Observable.of(Event2)
  observable: Rx.Observable.fromEvent(calendarEmitter, 'CALENDAR_UPDATE').flatMap(x => x).share(),
  _filterForLatestEvents,
  _parseUserIdFromEmail,
};

module.exports = Interface;

/**
 * Loading to the controller based on Channel Id
 * @param  {String} channelId Channel Id recieved from the notification
 * @return {Void} None
 */
function load(channelId) {
  debug('load %s', channelId);
  getChannelEntry(channelId).then(channelEntry => {
    debug('Found channel entry for %s: %O', channelId, channelEntry);
    // Old channel that may have existed due to overlap renewals
    if (!channelEntry) { return; }
    AdministerCalendars.incrementalSync(channelEntry)
      .then(syncResp => {
	debug('Syncing for calendar update (%s)', channelId);
	return syncResp;
      })
      .then(AdministerCalendars.persistNewSyncToken)
      .then(parseEvents)
      .then(parsedUpdates => {
	calendarEmitter.emit('CALENDAR_UPDATE', parsedUpdates);
      })
      .catch(console.log);
  });
}

// Emit events per a sync response
function emitEvents(syncResponse) {
  if (syncResponse.items.length === 0) {
    debug('No new events found on sync response for %s', syncResponse.calendarId);
    return false;
  }
  calendarEmitter.emit('CALENDAR_UPDATE', parseEvents(syncResponse));
  return true;
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
  if (!syncResponse.items || syncResponse.items.length === 0) return syncResponse;
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

  return updates;
}

// Looks through the list to find any matching event
// previously
// _filterForLatestEvent :: (Element, Index, Array) -> Boolean
function _filterForLatestEvents(currentEvent, currentIndex, list) {
  const mostRecentIndex = _.findIndex(list, (e) => e.id === currentEvent.id);
  // If the current item index is equal or less than the most recentIndex, keep it (true)
  return (currentIndex <= mostRecentIndex) ? true : false;
}

function _parseUserIdFromEmail(email) {
  if (typeof email !== 'string') {
    throw new Error('Email is not a string');
  }

  return email.match(/.+?(?=@)/g)[0];
}
