'use strict';

/**
 * Retrieve the user calendars from google api
 */
var google = require('googleapis');
var _ = require('lodash');
var calendar = google.calendar('v3');

/**
 * API to administer Calendars
 */
var Interface = {
  list: getCalendars
};

module.exports = Interface;

/**
 * invoke google api to get list of calendars
 * @param  {object}   authToken <required> secure JWT for list of calendars
 * @param  {object}   calendarParams parameters to retrieve list of calendars
 * @param  {Function} callback   for google's list of calendars response
 * @return {function} invokes callback
 */
function getCalendars(authToken, calendarParams, callback) {
  if (!authToken) return callback(new Error('No auth token provided'));
  var defaultParams = {
    customer: '',
    maxResults: 500,
    pageToken: ''
  };
  var params = _.extend(defaultParams, calendarParams);
  return calendar.list(params, callback);
}
