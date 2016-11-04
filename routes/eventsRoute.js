'use strict';

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
    return response.sendStatus(400);

  parseNotification(headers);
  response.sendStatus(200);
});

module.exports = router;

function parseNotification(parseHeaders) {
  var initialSyncConfirm = (parseHeaders.resourceState === 'sync');
  if (initialSyncConfirm)
    console.log(parseHeaders.channelId + ' channel has been established.');

  var eventUpdate = (parseHeaders.resourceState === 'exists');
  if (eventUpdate)
    eventController.load(parseHeaders.channelId);
}

function isWatchNotification(parseHeaders) {
  return (parseHeaders.channelId && parseHeaders.resourceId) ? true : false;
}
