'use strict';

var express           = require('express');
var router            = express.Router();  // eslint-disable-line new-cap
var AdminsterChannels = require('../services/AdministerChannels');
var parseHeaders      = AdminsterChannels.parseHeaders;
var bodyParser        = require('body-parser');
var jsonParser        = bodyParser.json({type: 'application/*'});
var mongoose          = require('mongoose');
var Channel           = mongoose.model('Channel', require('../data/schema/channel'));

/**
 * `watch/users` POST Route
 */
router.post('/', jsonParser, function watchIndexResponse(request, response) {
  var headers = parseHeaders(request);

  var syncNotification = (headers.resourceState === 'sync');
  if (syncNotification) logSyncConfirm(headers.channelId);

  // Looking only for 'create' events (new users)
  // 'update' events may need to be re-looked at
  if (isNewUserNotification(headers)) {
    // A safe guard to ensure that processing of new user only
    // occurs on a DIRECTORY channel that our current
    // application had created
    findDirectoryChannel(headers.channelId)
      .then(function findResponse(directoryChannel) {
        if (directoryChannel) {
          createNewChannel(request.body.primaryEmail);
          response.sendStatus(200);
        } else {
          response.sendStatus(400);
        }
      });
  } else {
    response.sendStatus(400);
  }
});

function logSyncConfirm(channelId) {
  console.log(channelId + ' channel has been established.');
}

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

function findDirectoryChannel(channelId) {
  return Channel.findOne({channelId: channelId});
}

module.exports = router;
