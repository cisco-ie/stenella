'use strict';

const express         = require('express');
const router          = express.Router(); // eslint-disable-line new-cap
const parseHeaders    = require('../services/AdministerChannels').parseHeaders;
const eventController = require('../controllers/eventController');
const debug = require('debug')('eventRoute');

/**
 * `watch/event` POST Route
 */
router.post('/', function eventRouteResponse(request, response) {
  const headers = parseHeaders(request);

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
  const initialSyncConfirm = (parsedHeaders.resourceState === 'sync');
  if (initialSyncConfirm) {
    debug(parsedHeaders.channelId + ' channel has been established.');
  }

  const eventUpdate = (parsedHeaders.resourceState === 'exists');
  if (eventUpdate) {
    debug('Event channel (%s) update detected, loading to controller', parsedHeaders.channelId)
    eventController.load(parsedHeaders.channelId);
  }
}

function isWatchNotification(parsedHeaders) {
  return (parsedHeaders.channelId && parsedHeaders.resourceId) ? true : false;
}
