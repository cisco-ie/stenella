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
  // More information: https://developers.google.com/google-apps/calendar/v3/push
  if (!isWatchNotification(headers))
    response.sendStatus(400);
  parseNotificationAndRespond(headers);
});


module.exports = router;

function parseNotificationAndRespond(parseHeaders) {
    // No parsing needed for a confirm notification
    if (isInitialSyncConfirm(headers))
      console.log(headers.channelId + ' channel has been established.');
    if (isEventUpdate(headers))
      eventController.load(headers.channelId);
    response.sendStatus(200);
}

function isWatchNotification(parseHeaders) {
  return (parseHeaders.channelId && parseHeaders.resourceId);
}

function isInitialSyncConfirm(parseHeaders) {
  return (parseHeaders.resourceState === 'sync');
}

function isEventUpdate(parseHeaders) {
  return (parseHeaders.resourceState === 'exists');
}
