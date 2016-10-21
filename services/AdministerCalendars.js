'use strict';

/**
 * Retrieve the user calendars from google api
 */
var google = require('googleapis');
var _ = require('lodash');
var calendar = google.calendar('v3');
var Promise = require('bluebird');

/**
 * API to administer Calendars
 */
var Interface = {
  list: getCalendars,
  fullSync: getFullSync,
  incrementalSync: getIncrementSync
};

module.exports = Interface;

/**
 * invoke google api to get list of calendars
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
  console.log(overrideOptions);
  return calendar.calendarList.list(params, overrideOptions, callback);
}

/**
 * Only performs the sync of items from Today to Future.
 * @param  {object}   client     Autheticated clients
 * @param  {string}   calendarId Associated Email with Calendar
 */
function getFullSync(jwtClient, calendarId) {
  var params = {
    auth: jwtClient,
    calendarId: calendarId,
    timeMin: (new Date()).toISOString(),
    singleEvents: false
  };

  // In the rare off cases where pagination is significantly large,
  // we need to keep making request to get to the last page for
  // the syncToken.
  // REF: https://developers.google.com/google-apps/calendar/v3/pagination
  var eventListRequest = function (params) {
    calendar.events.list(params, function createEventsWatchCb(err, result) {
      if (result.nextPageToken) {
        params.nextPageToken;
        eventListRequest(params);
      } else {
        if (err) Promise.reject(err);
        Promise.resolve(result);
      }
    });
  };

  // Invoke closure function EventListRequest, which
  // will paginate if necessary
  return eventListRequest(params);
}

/**
 * Get an incremental sync
 * @param  {Object}   jwtClient    Authenticated jwtClient
 * @param  {Object}   calendarInfo contains: id, syncToken
 * @return {Object}                Promise of calendar event list
 */
function getIncrementSync(jwtClient, calendarInfo) {
  var params = {
    auth: jwtClient,
    calendarId: calendarInfo.id,
    singleEvents: false,
    syncToken: calendarInfo.syncToken,
    showDeleted: true
  };

  return Promise.promisify(calendar.events.list)(params);
};
