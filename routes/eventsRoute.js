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
  parseNotification(headers);
  response.sendStatus(200);
});


module.exports = router;

function parseNotification(parseHeaders) {
    // No parsing needed for a confirm notification
    if (isInitialSyncConfirm(parseHeaders))
      console.log(parseHeaders.channelId + ' channel has been established.');
    if (isEventUpdate(parseHeaders))
      eventController.load(parseHeaders.channelId);
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
