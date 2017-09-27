'use strict';

const EventEmitter = require('events');
const _ = require('lodash');
const mongoose = require('mongoose');
const Rx = require('rxjs');
const debug = require('debug')('stenella:event-controller');
const NodeCache = require('node-cache');
const CalendarService = require('../services/calendar-service');
const ChannelEntry = mongoose.model('Channel', require('../data/schema/channel'));

const eventCache = new NodeCache();

mongoose.Promise = require('bluebird');

class CalendarEmitter extends EventEmitter {}
const calendarEmitter = new CalendarEmitter();

const Interface = {
	load,
	emitEvents,
	// [ Event1, Event2 ] => Observable.of(Event1) --> Observable.of(Event2)
	observable: Rx.Observable.fromEvent(calendarEmitter, 'CALENDAR_UPDATE').flatMap(x => x).share(),
	_filterForLatestEvents,
	_parseUserIdFromEmail,
	_syncAndEmit,
	_getChannelEntry,
	_removeNonCapableAttendees,
	_checkAgainstCache,
	_parseEvents
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
			// Old channel that may have existed due to overlap renewals
			if (!channelEntry) {
				debug('Channel entry not found, possibly due to overlap');
				return;
			}

			_syncAndEmit(channelEntry);
		})
		.catch(debug);
}

function _syncAndEmit(channelEntry) {
	CalendarService.incrementalSync(channelEntry)
		.then(syncResp => {
			CalendarService.persistNewSyncToken(channelEntry);
			debug('Syncing for calendar update (%s)', channelEntry.channelId);
			return syncResp;
		})
		.then(_parseEvents)
		.then(_removeNonCapableAttendees)
		.then(_checkAgainstCache)
		.then(parsedUpdates => {
			calendarEmitter.emit('CALENDAR_UPDATE', parsedUpdates);
		})
		.catch(debug);
}

// Emit events per a sync response
function emitEvents(syncResponse) {
	if (!syncResponse) {
		return;
	}

	if (syncResponse.items.length === 0) {
		debug('No new events found on sync response for %s', syncResponse.summary);
		return;
	}

	// @TODO: add better flow control here
	let updatedEvents = _parseEvents(syncResponse);
	updatedEvents = _removeNonCapableAttendees(updatedEvents);
	updatedEvents = _checkAgainstCache(updatedEvents);

	calendarEmitter.emit('CALENDAR_UPDATE', updatedEvents);
	return true;
}

/**
 * Returns the Channel Entry from Database
 * @param  {String} channelId string of channel entry
 * @return {Object}           Mongoose Virtual Model of Channel Entry
 */
function _getChannelEntry(channelId) {
	return ChannelEntry.findOne({channelId});
}

// Remove any attendees that don't have modifying abilities
// Are intentions are to only perform logic against users who can update the event
function _removeNonCapableAttendees(events) {
	if (!events) {
		return events;
	}
	if (!Array.isArray(events)) {
		return events;
	}

	return events.filter(calendarEvent => {
		const calendarOwner = calendarEvent.calendarId;

		if (calendarEvent.guestsCanModify === true) {
			return true;
		}

		if (calendarEvent.creator.email === calendarOwner) {
			return true;
		}

		return false;
	});
}

// Check
function _checkAgainstCache(events) {
	if (!events) {
		return events;
	}
	if (!Array.isArray(events)) {
		return events;
	}

	return events.filter(currentEvent => {
		const cachedEvent = eventCache.get(currentEvent.id);
		return cachedEvent ? _handleExistingEvent(currentEvent, cachedEvent) : _handleNewEvent(currentEvent);
	});
}

// Add event to temporary cache, and allow it to pass filter
function _handleNewEvent(calendarEvent) {
	const val = _buildValue(calendarEvent);
	eventCache.set(calendarEvent.id, val, 30);
	return true;
}

// If the guest can edit or this is the creators calendar
// check against current cache to see if this is completely a new event
// or not
function _handleExistingEvent(currentEvent, cachedEvent) {
	const currentTimeStamp = new Date(currentEvent.updated).getTime();
	const oldEvent = currentTimeStamp < cachedEvent.timeStamp;
	if (oldEvent) {
		return false;
	}

	// Going to remove some additional meta data used by _parseEvents
	// and google specific changes per calendar
	const attendees = currentEvent.attendees || [];
	const cleanedEvent = Object.assign({}, currentEvent,
												{userId: '', calendarId: '', htmlLink: '', attendees: attendees.length});
	const currentEventString = JSON.stringify(cleanedEvent);
	if (currentEventString === cachedEvent.eventString) {
		return false;
	}

	const val = _buildValue(currentEvent);
	eventCache.set(currentEvent.id, val, 30);

	return true;
}

function _buildValue(calendarEvent) {
	const attendees = calendarEvent.attendees || [];
	const details = Object.assign({},
		calendarEvent,
		{userId: '', calendarId: '', htmlLink: '', attendees: attendees.length});

	return {
		eventString: JSON.stringify(details),
		timeStamp: new Date(calendarEvent.updated).getTime()
	};
}

function _parseEvents(syncResponse) {
	if (!syncResponse.items || syncResponse.items.length === 0) {
		return syncResponse;
	}
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
	return (currentIndex <= mostRecentIndex);
}

function _parseUserIdFromEmail(email) {
	if (typeof email !== 'string') {
		throw new TypeError('Email is not a string');
	}

	return email.match(/.+?(?=@)/g)[0];
}
