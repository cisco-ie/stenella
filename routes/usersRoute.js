'use strict';

var express = require('express');
var router = express.Router();
var scope = require('../constants/GoogleScopes');
var Promise = require('bluebird');
var AdministerCalendars = require('../services/AdministerCalendars');
var AdminsterChannels = require('../services/AdministerChannels');

router.post('/', jsonParser, function (request, response) {
  var headers = parseHeaders(request);

  // Looking only for 'create' events,
  // 'update' events may need to be re-looked at,
  // however, there is apparently an alias which is created
  var isCreateNotification = (headers.channelId &&
                              headers.resourceId &&
                              headers.resourceState === 'create');

  if (isCreateNotification) {
    var userId = request.body.primaryEmail;
    createChannelAndSave(userId);
    response.sendStatus(200);
  }

  // POST request not regarding notifications should not be sent here
  response.sendStatus(400);
  }
});

function createChannelAndSave (userId) {
  // @TODO: Abstract as this is used in index.js
  var channelInfo = {
    type: 'event',
    id: userId
  };

  var eventChannelPromise = AdministerChannels.create(channelInfo);
  var syncTokenPromise = AdministerCalendars.getSyncToken(userId);

  Promise.all([
    syncTokenPromise,
    eventChannelPromise,
  ])
  .spread(function(syncToken, channelInfo) {
    channelInfo.syncToken = syncToken;
    channelInfo.calendarId = userId;
    channelInfo.type = 'event'
    AdministerChannels.save(channelInfo);
  })
}

module.exports = router;
