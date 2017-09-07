'use strict';

const EventEmitter = require('events');
const _ = require('lodash');
const mongoose = require('mongoose');
const AdministerCalendars = require('../services/AdministerCalendars');
const Rx = require('rxjs');
const NodeCache = require('node-cache');

const eventCache = new NodeCache();
const ChannelEntry = mongoose.model('Channel', require('../data/schema/channel'));
const debug = require('debug')('eventController');

mongoose.Promise = require('bluebird');

class CalendarEmitter extends EventEmitter {}
const calendarEmitter = new CalendarEmitter();

let Interface = {
  load,
  emitEvents,
  // [ Event1, Event2 ] => Observable.of(Event1) --> Observable.of(Event2)
  observable: Rx.Observable.fromEvent(calendarEmitter, 'CALENDAR_UPDATE').flatMap(x => x).share(),
  _filterForLatestEvents,
  _parseUserIdFromEmail,
  _syncAndEmit,
  _getChannelEntry,
  _removeNonCapableAttendees
};

module.exports = Interface;

/**
 * Loading to the controller based on Channel Id
 * @param  {String} channelId Channel Id recieved from the notification
 * @return {Void} None
 */
function load(channelId) {
  debug('load %s', channelId);

  _getChannelEntry(channelId)
    .then(channelEntry => {
      console.log(channelEntry);
      // Old channel that may have existed due to overlap renewals
      if (!channelEntry) {
        debug('Channel entry not found, possibly due to overlap');
        return;
      };
      _syncAndEmit(channelEntry);
    })
    .catch(debug);
}

function _syncAndEmit(channelEntry) {
  AdministerCalendars.incrementalSync(channelEntry)
    .then(syncResp => {
      AdministerCalendars.persistNewSyncToken(channelEntry);
      debug('Syncing for calendar update (%s)', channelEntry.channelId);
      return syncResp;
    })
    .then(parseEvents)
    .then(parsedUpdates => {
      calendarEmitter.emit('CALENDAR_UPDATE', parsedUpdates);
    })
    .catch(debug);
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
function _getChannelEntry(channelId) {
    return ChannelEntry.findOne({ channelId: channelId });
}

// Compare the owner and the id
// This will cache new events into a temporary cache (1 m) 
// and check to see if the following event needs to be added or not
// Returns modified response
// function _cacheAndRemoveAttendees(syncResp) {
//   eventCache.
// }

// Remove any attendees that don't have modifying abilities
// Are intentions are to only perform logic against users who can update the event
function _removeNonCapableAttendees(syncResp) {
  const calendarOwner = syncResp.summary;
  if (syncResp.items) {
    const updatedList = syncResp.items.filter(calendarEvent => {
      if (calendarEvent.guestsCanModify === true) {
        return true;
      }

      if (calendarEvent.creator.email === calendarOwner) {
        return true;
      }

      return false;
    });

    return Object.assign({}, syncResp, { items: updatedList });
  }

  return syncResp;
}

function parseEvents(syncResponse) {
    if (!syncResponse.items || syncResponse.items.length === 0) return syncResponse;
    // Filter events for any duplicates and just get the latest one
    const eventList = syncResponse.items.filter(_filterForLatestEvents);
    const userId = _parseUserIdFromEmail(syncResponse.summary);
    const updates = eventList.map(event => {
        event.calendarId = syncResponse.summary;
        event.userId = userId;
        return event;
    });
    return updates;
}

// Looks through the list to find any matching event
// _filterForLatestEvent :: (Element, Index, Array) -> Boolean
function _filterForLatestEvents(currentEvent, currentIndex, list) {
  const mostRecentIndex = _.findIndex(list, e => e.id === currentEvent.id);
  // If the current item index is equal or less than the most recentIndex, keep it (true)
  return currentIndex <= mostRecentIndex ? true : false;
}

function _parseUserIdFromEmail(email) {
  if (typeof email !== 'string') {
    throw new Error('Email is not a string');
  }

  return email.match(/.+?(?=@)/g)[0];
}
