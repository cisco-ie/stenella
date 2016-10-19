'use strict';

/**
 * Variable Declarations
 */
var express        = require('express'),
  router           = express.Router(),
  parseHeaders     = require('../services/AdministerChannels').parseHeaders;
  EventsController = require('../controller/EventsController');

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
      EventsController.load(headers.channelId);
    }
    response.sendStatus(200);
  } else {
    response.sendStatus(400);
  }
});

/**
 * Query if Channel Watch Notification
 * @param  {object}  parseHeaders parse request headers
 * @return {Boolean}
 */
function isWatchNotification(parseHeaders) {
  return (parseHeaders.channelId && parseHeaders.resourceId);
}

/**
 * Query if the request is the initial confirmation
 * @param  {object}  parseHeaders parse request headers
 * @return {Boolean}
 */
function isInitialSync(parseHeaders) {
  return (parseHeaders.resourceState === 'sync');
}

/**
 * Query if the request is an event update
 * @param  {object}  parseHeaders parse request headers
 * @return {Boolean}                [description]
 */
function isEventUpdate(parseHeaders) {
  return (parseHeaders.resourceState === 'exists');
}


module.exports = router;
