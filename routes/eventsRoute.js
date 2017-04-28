'use strict';

var express         = require('express');
var router          = express.Router(); // eslint-disable-line new-cap
var parseHeaders    = require('../services/AdministerChannels').parseHeaders;
var eventController = require('../controllers/eventController');
const debug = require('debug')('eventRoute');

/**
 * `watch/event` POST Route
 */
router.post('/', function eventRouteResponse(request, response) {
  var headers = parseHeaders(request);

  // More information: https://developers.google.com/google-apps/calendar/v3/push
  if (!isWatchNotification(headers)) {
    response.sendStatus(400);
  } else {
    parseNotification(headers);
    response.sendStatus(200);
  }
});

module.exports = router;

function parseNotification(parsedHeaders) {
  var initialSyncConfirm = (parsedHeaders.resourceState === 'sync');
  if (initialSyncConfirm) {
    debug(parsedHeaders.channelId + ' channel has been established.');
  }

  var eventUpdate = (parsedHeaders.resourceState === 'exists');
  if (eventUpdate) {
    eventController.load(parsedHeaders.channelId);
  }
}

function isWatchNotification(parsedHeaders) {
  return (parsedHeaders.channelId && parsedHeaders.resourceId) ? true : false;
}
