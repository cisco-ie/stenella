'use strict';

const express = require('express');
const router = express.Router();  // eslint-disable-line new-cap
const AdminsterChannels = require('../services/AdministerChannels');
const parseHeaders = AdminsterChannels.parseHeaders;
const bodyParser = require('body-parser');
const jsonParser = bodyParser.json({type: 'application/*'});
const mongoose = require('mongoose');
const Channel = mongoose.model('Channel', require('../data/schema/channel'));
const debug = require('debug')('userRoute');
/**
 * `watch/users` POST Route
 */
router.post('/', jsonParser, function watchIndexResponse(request, response) {
	const headers = parseHeaders(request);

	var syncNotification = (headers.resourceState === 'sync');
	if (syncNotification) {
		logSyncConfirm(headers.channelId);
		response.sendStatus(200);
		return;
	}

	// Looking only for 'create' events (new users)
	// 'update' events may need to be re-looked at
	if (isNewUserNotification(headers)) {
		// A safe guard to ensure that processing of new user only
		// occurs on a DIRECTORY channel that our current
		// application had created
		findDirectoryChannel(headers.channelId)
			.then(directoryChannel => {
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
	debug(channelId + ' channel has been established.');
}

function createNewChannel(calendarId) {
	createEventChannel(calendarId)
		.then(AdminsterChannels.save)
		.then(AdminsterChannels.renew)
		.catch(debug);
}

function isNewUserNotification(parsedHeaders) {
	return (parsedHeaders.channelId && parsedHeaders.resourceId && parsedHeaders.resourceState === 'create') ? true : false;
}

function createEventChannel(calendarId) {
	const channelInfo = {
		resourceType: 'event',
		calendarId: calendarId
	};
	return AdminsterChannels.create(channelInfo);
}

function findDirectoryChannel(channelId) {
	return Channel.findOne({channelId: channelId});
}

module.exports = router;
