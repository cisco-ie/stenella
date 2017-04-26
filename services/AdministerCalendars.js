'use strict';

const google    = require('googleapis');
const calendar  = google.calendar('v3');
const Promise   = require('bluebird');
const AdministerJWT = require('../services/AdministerJWT');
const scope     = require('../constants/GoogleScopes');

const Interface = {
  fullSync: getFullSync,
  incrementalSync: getIncrementalSync,
  getSyncToken: getSyncToken,
  updateEvent: updateEvent
};

module.exports = Interface;

/**
 * Only performs the sync of items from Today to Future.
 * @param  {string}   calendarId Associated Email with Calendar
 * @return {object} full sync response object
 */
function getFullSync(calendarId) {
  const params = {
    calendarId: calendarId,
    timeMin: (new Date()).toISOString(),
    singleEvents: false
  };

  // In the rare off cases where pagination is significantly large,
  // we need to keep making request to get to the last page for
  // the syncToken.
  // REF: https://developers.google.com/google-apps/calendar/v3/pagination
  const eventListRequest = (listParams) => {
    return AdministerJWT.createJWT(scope.calendar)
      .then((jwtClient) => {
        listParams.auth = jwtClient;

        return calendar.events.list(listParams, (err, result) => {
          if (err) {
            return Promise.reject(err);
          }

          if (result.nextPageToken) {
            listParams.nextPageToken = result.nextPageToken;
            return eventListRequest(listParams);
          }

          return Promise.resolve(result);
        });
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

  return new Promise((resolve, reject) => {
    AdministerJWT.createJWT(scope.calendar)
      .then((jwtClient) => {
        const params = {
          auth: jwtClient,
          calendarId: calendarInfo.calendarId || calendarInfo.id,
          singleEvents: false,
          syncToken: calendarInfo.syncToken,
          showDeleted: true
        };

        Promise.promisify(calendar.events.list)(params)
          .then(resolve)
          .catch(reject);
      });
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
      .then((response) => resolve(response.nextSyncToken))
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
  if (!params) throw new Error('Missing params for update Event');
  const requiredParams = (params.eventId && params.calendarId);
  if (!requiredParams) throw new Error('Missing required eventId or calendarId');

  // Return if no updates to save redundant API request
  if (!updateInfo) throw new Error('No update information passed');

  params.resource = updateInfo;
  return AdministerJWT.createJWT(scope.calendar)
    .then(function jwtResponse(jwtClient) {
      params.auth = jwtClient;
      return Promise.promisify(calendar.events.update)(params);
    });
}
