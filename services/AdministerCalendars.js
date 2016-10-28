'use strict';

var google = require('googleapis');
var _ = require('lodash');
var calendar = google.calendar('v3');
var Promise = require('bluebird');
var createJWT = require('../services/AdministerJWT').createJWT;
var scope = require('../constants/GoogleScopes');
var logError = require('../libs/errorHandlers').logError;

var Interface = {
  list: getCalendars,
  fullSync: getFullSync,
  incrementalSync: getIncrementalSync,
  getSyncToken: getSyncToken,
  updateEvent: updateEvent
};

module.exports = Interface;

/**
 * Invoke google api to get list of calendars
 * @param  {object}   authToken <required> secure JWT for list of calendars
 * @param  {object}   calendarParams parameters to retrieve list of calendars
 * @param  {Function} callback   for google's list of calendars response
 * @return {function} invokes callback
 */
function getCalendars(authToken, calendarParams, userId, callback) {
  // @TODO: add support for pagination under Utilities
  var overrideOptions = {
    url: 'https://www.googleapis.com/calendar/v3/users/' + userId + '/calendarList'
  };
  if (!authToken) return callback(new Error('No auth token provided'));
  var defaultParams = {
    maxResults: 500
  };
  var params = _.extend(defaultParams, calendarParams);
  return calendar.calendarList.list(params, overrideOptions, callback);
}

/**
 * Only performs the sync of items from Today to Future.
 * @param  {object}   client     Autheticated clients
 * @param  {string}   calendarId Associated Email with Calendar
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
  var eventListRequest = function (params) {
    return new Promise(function(resolve, reject) {
      createJWT(scope.calendar)
        .then(function(jwtClient) {
          params.auth = jwtClient;
          calendar.events.list(params, function createEventsWatchCb(err, result) {
            if (err) reject(err);
            if (result.nextPageToken) {
              params.nextPageToken = result.nextPageToken;
              eventListRequest(params);
            }
            resolve(result);
          });
        });
      });
  };

  return eventListRequest(params);
}

/**
 * Get an Incremental Sync
 * @param  {Object}   jwtClient    Authenticated jwtClient
 * @param  {Object}   calendarInfo contains: id, syncToken
 * @return {Object}                Promise of calendar event list
 */
function getIncrementalSync(calendarInfo) {
  console.log(calendarInfo)
  return new Promise(function (resolve, reject) {
    createJWT(scope.calendar)
      .then(function(jwtClient) {
        var params = {
          auth: jwtClient,
          calendarId: calendarInfo.calendarId || calendarInfo.id,
          singleEvents: false,
          syncToken: calendarInfo.syncToken,
          showDeleted: true
        };

        Promise.promisify(calendar.events.list)(params)
          .then(function(response) {
            resolve(response);
          })
          .catch(reject);
      });
  });
}

/**
 * Returns a sync Token
 * @param  {String} calendarId calendar id of desired token
 * @return {String}            the syncToken
 */
function getSyncToken (calendarId) {
  return new Promise(function (resolve, reject) {
    getFullSync(calendarId)
      .then(function(response) {
        resolve(response.nextSyncToken);
      });
  });
}

/**
 * Updates the calendar
 * @param  {String} calendarId calendarId/Google user
 */
function updateEvent (params, updateInfo) {
  var requiredParams = (params.eventId && params.calendarId);
  if (!requiredParams)
    throw new Error('Missing required eventId or calendarId');

  var params = {
    eventId: params.eventId,
    calendarId: params.calendarId,
    resource: updateInfo
  };

  return createJWT(scope.calendar)
    .then(function(jwtClient) {
      params.auth = jwtClient;
      return Promise.promisify(calendar.events.update)(params)
    });
}
