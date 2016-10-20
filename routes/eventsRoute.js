'use strict';

/**
 * Variable Declarations
 */
var express         = require('express');
var router          = express.Router();
var parseHeaders    = require('../services/AdministerChannels').parseHeaders;
var eventController = require('../controllers/eventController');

/**
 * `watch/event` POST Route
 */
router.post('/', function (request, response) {
  var headers = parseHeaders(request)
  // More information regarding syncs:
  // https://developers.google.com/google-apps/calendar/v3/push
  if (isWatchNotification(headers)) {
    if (isInitialSync(headers)) {
      var message = headers.channelId + ' channel has been established.';
      console.log(message);
    }
    if (isEventUpdate(headers)) {
      eventController.load(headers.channelId);
    }
    response.sendStatus(200);
  } else {
    response.sendStatus(400);
  }
});

module.exports = router;

/**
 * Query if Channel Watch Notification
 * @param  {object}  parseHeaders parse request headers
 * @return {Boolean} state of channel notification being watch or not
 */
function isWatchNotification(parseHeaders) {
  return (parseHeaders.channelId && parseHeaders.resourceId);
}

/**
 * Query if the request is the initial confirmation
 * @param  {object}  parseHeaders parse request headers
 * @return {Boolean} state of notification being initial or not
 */
function isInitialSync(parseHeaders) {
  return (parseHeaders.resourceState === 'sync');
}

/**
 * Query if the request is an event update
 * @param  {object}  parseHeaders parse request headers
 * @return {Boolean}               state of watch notificatio
 */
function isEventUpdate(parseHeaders) {
  return (parseHeaders.resourceState === 'exists');
}
