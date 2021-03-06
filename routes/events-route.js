const express = require('express');
const debug = require('debug')('stenella:events-route');
const parseHeaders = require('../services/channel-service').parseHeaders;
const eventController = require('../controllers/event-controller');

const router = express.Router(); // eslint-disable-line new-cap

router.post('/', (request, response) => {
	const headers = parseHeaders(request);

	// More information: https://developers.google.com/google-apps/calendar/v3/push
	if (isWatchNotification(headers)) {
		parseNotification(headers);
		response.sendStatus(200);
	} else {
		response.sendStatus(400);
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
		debug('Event channel (%s) update detected, loading to controller', parsedHeaders.channelId);
		eventController.load(parsedHeaders.channelId);
	}
}

function isWatchNotification(parsedHeaders) {
	return (parsedHeaders.channelId && parsedHeaders.resourceId);
}
