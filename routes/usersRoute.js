'use strict';

var express = require('express');
var router = express.Router();
var scope = require('../constants/GoogleScopes');
var Promise = require('bluebird');
var AdministerCalendars = require('../services/AdministerCalendars');
var AdminsterChannels = require('../services/AdministerChannels');
var parseHeaders = AdminsterChannels.parseHeaders;
var bodyParser = require('body-parser');
var jsonParser = bodyParser.json({type: 'application/*'});
var mongoose = require('mongoose');
var Channel = mongoose.model('Channel', require('../data/schema/channel'));

/**
 * `watch/users` POST Route
 */
router.post('/', jsonParser, function (request, response) {
  var headers = parseHeaders(request);

  var syncNotification = (headers.resourceState === 'sync');
  if (syncNotification)
      console.log(headers.channelId + ' channel has been established.');

  // Looking only for 'create' events (new users)
  // 'update' events may need to be re-looked at
  if (isCreateNotification(headers)) {
    // @TODO: Clean up into seperate function
    return findExisting(headers.channelId)
      .then(function(existingChannel) {
        if (existingChannel) {
          var calendarId = request.body.primaryEmail;
          createEventChannel(calendarId)
            .then(AdminsterChannels.save)
            .then(AdminsterChannels.renew);

          return response.sendStatus(200);
        }

        return response.sendStatus(400);
      });
  }

  // POST request not regarding notifications should not be sent here
  response.sendStatus(400);
});

function isCreateNotification (parseHeaders) {
  return (parseHeaders.channelId && parseHeaders.resourceId && parseHeaders.resourceState === 'create') ? true : false;
}

function createEventChannel (calendarId) {
  var channelInfo = {
    resourceType: 'event',
    calendarId: calendarId
  }
  return AdminsterChannels.create(channelInfo);
}

function findExisting(channelId) {
  return Channel.findOne({channelId: channelId});
}

module.exports = router;
