'use strict';

const google = require('googleapis');
const Promise = require('bluebird');
const mongoose = require('mongoose');
const debug = require('debug')('stenella:calendar-service');
// Is reassigned through rewire
// eslint-disable-next-line prefer-const
let {createJWT} = require('../services/jwt-service');
const scope = require('../constants/google-scopes');
const ChannelEntry = mongoose.model('Channel', require('../data/schema/channel'));

const calendar = google.calendar('v3');
// eslint-disable-next-line no-use-extend-native/no-use-extend-native, prefer-const
let listEvents = Promise.promisify(calendar.events.list);

const Interface = {
	fullSync: getFullSync,
	incrementalSync: getIncrementalSync,
	getSyncToken,
	updateEvent,
	persistNewSyncToken
};

module.exports = Interface;

/**
 * Only performs the sync of items from Today to Future.
 * @param  {string} calendarId Associated Email with Calendar
 * @return {object} full sync response object
 */
function getFullSync(calendarId) {
	const params = {
		calendarId,
		timeMin: (new Date()).toISOString(),
		singleEvents: false
	};

	// In the rare off cases where pagination is significantly large,
	// we need to keep making request to get to the last page for
	// the syncToken.
	// REF: https://developers.google.com/google-apps/calendar/v3/pagination
	const eventListRequest = function eventListRequest(listParams) {
		return createJWT(scope.calendar)
			.then(jwtClient => Object.assign({}, listParams, {auth: jwtClient}))
			.then(listEvents)
			.then(result => {
				debug('Get calendar events for %s', listParams.calendarId);
				if (result.nextPageToken) {
					debug('Paging calendar events for %s', listParams.calendarId);
					listParams.nextPageToken = result.nextPageToken;
					return eventListRequest(listParams);
				}
				return result;
			});
	};

	return eventListRequest(params);
}

/**
 * Get an Incremental Sync
 * @param  {Object}   calendarInfo contains: id, syncToken
 * @return {Object}   Promise of calendar event list
 */
function getIncrementalSync(calendarInfo) {
	if (!calendarInfo) {
		throw new Error('CalendarInfo is not defined');
	}

	if (!calendarInfo.syncToken) {
		throw new Error('No calendar.syncToken found');
	}

	return new Promise((resolve, reject) => {
		createJWT(scope.calendar)
			.then(jwtClient => listEvents({
				auth: jwtClient,
				calendarId: calendarInfo.calendarId || calendarInfo.id,
				singleEvents: false,
				syncToken: calendarInfo.syncToken,
				showDeleted: true
			}))
			.then(resolve)
			.catch(reject);
	});
}

/**
 * Returns a sync Token
 * @param  {String} calendarId calendar id of desired token
 * @return {String}            the syncToken
 */
function getSyncToken(calendarId) {
	return new Promise((resolve, reject) => {
		getFullSync(calendarId)
			.then(response => {
				const syncToken = response.nextSyncToken;
				if (!syncToken) {
					throw new Error('No syncToken found in response');
				}

				resolve(syncToken);
			})
			.catch(reject);
	});
}

/**
 * Updates the calendar
 * @param  {object} params eventId and calendarId
 * @param  {object} updateInfo contains the event information update
 * @param  {String} updateInfo.summary summary
 * @param  {String} updateInfo.location location
 * @param  {String} updateInfo.description description
 * @param  {time} updateInfo.start start time
 * @param  {time} updateInfo.end end time
 * @return {Object} promise thenable promise
 */
function updateEvent(params, updateInfo) {
	if (!params) {
		throw new Error('Missing params for update Event');
	}

	const requiredParams = (params.eventId && params.calendarId);
	if (!requiredParams) {
		throw new Error('Missing required eventId or calendarId');
	}

	// Return if no updates to save redundant API request
	if (!updateInfo) {
		throw new Error('No update information passed');
	}

	params.resource = updateInfo;
	return createJWT(scope.calendar)
		.then(jwtClient => {
			params.auth = jwtClient;
			// eslint-disable-next-line no-use-extend-native/no-use-extend-native
			return Promise.promisify(calendar.events.update)(params);
		});
}

/**
 * Updates the token, but also passes along the response to the chain
 * @param  {Object} syncResponse Incremental sync JSON response
 * @return {Object}              Returns the response out to continue the chain
 */
function persistNewSyncToken(syncResponse) {
	const calendarId = syncResponse.summary;
	const query = {
		calendarId
	};

	const update = {
		syncToken: syncResponse.nextSyncToken
	};

	return ChannelEntry.update(query, update)
		.exec()
		.then(r => r.nModified > 0 ? debug('Updated %s\'s syncToken', calendarId) : syncResponse);
}
