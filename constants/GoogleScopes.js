/**
 * Define constants
 */
var baseUrl = 'https://www.googleapis.com/auth/';

/**
 * Google Calendar API url   https://developers.google.com/google-apps/calendar/
 * Google Calendar User Directory  https://developers.google.com/admin-sdk/
 */
var scopeUrls = {
  calendar: baseUrl + 'calendar',
  userDirectory: baseUrl + 'admin.directory.user'
};


module.exports = scopeUrls;
