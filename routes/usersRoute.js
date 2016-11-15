'use strict';

var express = require('express');
var router = express.Router();  // eslint-disable-line new-cap
var AdminsterChannels = require('../services/AdministerChannels');
var parseHeaders = AdminsterChannels.parseHeaders;
var bodyParser = require('body-parser');
var jsonParser = bodyParser.json({type: 'application/*'});
var mongoose = require('mongoose');
var Channel = mongoose.model('Channel', require('../data/schema/channel'));

/**
 * `watch/users` POST Route
 */
router.post('/', jsonParser, function watchIndexResponse(request, response) {
  var headers = parseHeaders(request);

  var syncNotification = (headers.resourceState === 'sync');
  if (syncNotification) {
    console.log(headers.channelId + ' channel has been established.');
  }

  // Looking only for 'create' events (new users)
  // 'update' events may need to be re-looked at
  if (isNewUserNotification(headers)) {
    // A guard to ensure that processing of new user only
    // occurs on a channel that the application is aware of
    return findExistingChannel(headers.channelId)
      .then(function existingChannelResponse(existingChannel) {
        if (existingChannel) {
          createNewChannel(request.body.primaryEmail);
          return response.sendStatus(200);
        }

        return response.sendStatus(400);
      });
  }

  return response.sendStatus(400);
});

function createNewChannel(calendarId) {
  createEventChannel(calendarId)
    .then(AdminsterChannels.save)
    .then(AdminsterChannels.renew)
    .catch(console.log);
}

function isNewUserNotification(parsedHeaders) {
  return (parsedHeaders.channelId && parsedHeaders.resourceId && parsedHeaders.resourceState === 'create') ? true : false;
}

function createEventChannel(calendarId) {
  var channelInfo = {
    resourceType: 'event',
    calendarId: calendarId
  };
  return AdminsterChannels.create(channelInfo);
}

function findExistingChannel(channelId) {
  return Channel.findOne({channelId: channelId});
}

module.exports = router;
