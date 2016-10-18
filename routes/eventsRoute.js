'use strict';

/**
 * Variable Declarations
 */
var express        = require('express'),
  router           = express.Router(),
  parseHeaders     = require('../services/AdministerChannels').parseHeaders;

router.post('/', function (request, response) {
  var headers = parseHeaders(request)
  // More information regarding syncs:
  // https://developers.google.com/google-apps/calendar/v3/push
  if (headers.channelId && headers.resourceId) {
    // Initial Successful Sync
    if (headers.resourceState === 'sync') {
      var message = headers.channelId + ' channel has been established.';
      console.log(message);
    // A request regarding a Notification update
    } else if (headers.resourceState === 'exists') {
      EventsController.load(headers.channelId);
    }
    // Respond to Server that it is a success
    response.sendStatus(200);
  } else {
    // POST request not regarding notifications should not be sent here
    response.sendStatus(400);
  }
});

module.exports = router;
