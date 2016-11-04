'use strict';

var express = require('express');
var router = express.Router();
var scope = require('../constants/GoogleScopes');
var Promise = require('bluebird');
var AdministerCalendars = require('../services/AdministerCalendars');
var AdminsterChannels = require('../services/AdministerChannels');
var parseHeaders = AdminsterChannels.parseHeaders;

/**
 * `watch/users` POST Route
 */
router.post('/', function (request, response) {
  var headers = parseHeaders(request);

  var syncNotification = (headers.resourceState === 'sync');
  if (syncNotification)
      console.log(headers.channelId + ' channel has been established.');

  // Looking only for 'create' events (new users)
  // 'update' events may need to be re-looked at
  if (isCreateNotification(headers)) {
    var calenderId = requrest.body.primaryEmail;
    createEventChannel(calenderId)
      .then(AdminsterChannels.save)
      .then(AdminsterChannels.renew);

    response.sendStatus(200);
  }

  // POST request not regarding notifications should not be sent here
  response.sendStatus(400);
});

function isCreateNotification (parseHeaders) {
  return (parseHeaders.channelId && parseHeaders.resourceId && parseHeaders.resourceState === 'create') ? true : false;
}

function createEventChannel (calendarId) {
  var channelInfo = {
    type: 'event',
    calenderId: calenderId
  }
  return AdminsterChannels.create(channelInfo);
}

module.exports = router;
