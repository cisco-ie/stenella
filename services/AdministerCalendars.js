'use strict';

var google    = require('googleapis');
var calendar  = google.calendar('v3');
var Promise   = require('bluebird');
var AdministerJWT = require('../services/AdministerJWT');
var scope     = require('../constants/GoogleScopes');

var Interface = {
  fullSync: getFullSync,
  incrementalSync: getIncrementalSync,
  getSyncToken: getSyncToken,
  updateEvent: updateEvent
};

module.exports = Interface;

// /**
//  * Invoke google api to get list of calendars
//  * @param  {object}   authToken <required> secure JWT for list of calendars
//  * @param  {object}   calendarParams parameters to retrieve list of calendars
//  * @param  {Function} callback   for google's list of calendars response
//  * @return {function} invokes callback
//  */
// function getCalendars(authToken, calendarParams, userId, callback) {
//   // @TODO: add support for pagination under Utilities
//   var overrideOptions = {
//     url: 'https://www.googleapis.com/calendar/v3/users/' + userId + '/calendarList'
//   };
//   if (!authToken) return callback(new Error('No auth token provided'));
//   var defaultParams = {
//     maxResults: 500
//   };
//   var params = _.extend(defaultParams, calendarParams);
//   return calendar.calendarList.list(params, overrideOptions, callback);
// }

/**
 * Only performs the sync of items from Today to Future.
 * @param  {string}   calendarId Associated Email with Calendar
 * @return {object} full sync response object
 */
function getFullSync(calendarId) {
  var params = {
    calendarId: calendarId,
    timeMin: (new Date()).toISOString(),
    singleEvents: false
  };

  // In the rare off cases where pagination is significantly large,
  // we need to keep making request to get to the last page for
  // the syncToken.
  // REF: https://developers.google.com/google-apps/calendar/v3/pagination
  var eventListRequest = function eventListRequest(listParams) {
    return new Promise(function eventListPromise(resolve, reject) {
      AdministerJWT.createJWT(scope.calendar)
        .then(function jwtResponse(jwtClient) {
          listParams.auth = jwtClient;
          calendar.events.list(listParams, function createEventsWatchCb(err, result) {
            if (err) reject(err);
            // @TODO: Bug with null results after user
            // creation, need to investigate
            if (result) {
              if (result.nextPageToken) {
                listParams.nextPageToken = result.nextPageToken;
                eventListRequest(listParams);
              }
              resolve(result);
            }
          });
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
  return new Promise(function incrementalSyncPromise(resolve, reject) {
    AdministerJWT.createJWT(scope.calendar)
      .then(function jwtResponse(jwtClient) {
        var params = {
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
  return new Promise(function syncTokenPromise(resolve, reject) {
    getFullSync(calendarId)
      .then(function fullSyncResponse(response) {
        resolve(response.nextSyncToken);
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
  if (!params) throw new Error('Missing params for update Event');
  var requiredParams = (params.eventId && params.calendarId);
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
