'use strict';

var express = require('express');
var router = express.Router();
var scope = require('../constants/GoogleScopes');
var Promise = require('bluebird');
var AdministerCalendars = require('../services/AdministerCalendars');
var AdminsterChannels = require('../services/AdministerChannels');
var parseHeaders = AdminsterChannels.parseHeaders;


router.post('/', function (request, response) {
  var headers = parseHeaders(request);

  // Looking only for 'create' events (new users)
  // 'update' events may need to be re-looked at
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
});



module.exports = router;
