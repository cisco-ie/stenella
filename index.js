const https = require('https');
const fs = require('fs');
const path = require('path');
const express = require('express');
const Promise = require('bluebird');
const _ = require('lodash');
const mongoose = require('mongoose');
const requireAll = require('require-all');
const debug = require('debug')('stenella:index');
const UserService = require('./services/user-service');
const ChannelService = require('./services/channel-service');
const CalendarService = require('./services/calendar-service');
const config = require('./configs/app-config').APP;
const db = require('./data/db/connection')('production'); // eslint-disable-line no-unused-vars
const eventController = require('./controllers/event-controller');
mongoose.Promise = require('bluebird');
const Channel = mongoose.model('Channel', require('./data/schema/channel'));

const app = express();

app.get('/', (req, res) => res.send('Calender Listener Works!'));
// This is used to allow drop-in html files for Google verification
app.use('/', express.static(path.join(__dirname, '/verify')));

const serverAPI = {
	events: '/watch/events',
	users: '/watch/users'
};

app.use(serverAPI.events, require('./routes/events-route'));
app.use(serverAPI.users, require('./routes/users-route'));

initServer();

function initServer() {
	removeExpiredChannels();
	let userList;
	if (config.whitelist) {
		userList = config.whitelist;
	}

	setUpChannels(userList)
		.then(() => {
			loadObservers();
			console.log('Observers loaded, now listening to calendars');
		})
		.catch(debug);

	if (config.ssl === true) {
		debug('SSL setting detected, running HTTPS');
		if (config.port !== '443') {
			debug(`Server is running on port, ${config.port}. Are you sure you don't want to run on 443?`);
		}
		https
			.createServer({
				key: fs.readFileSync(config.sslOptions.privateKey, 'ascii'),
				cert: fs.readFileSync(config.sslOptions.cert, 'ascii'),
				passphrase: config.sslOptions.passphrase || ''
			}, app)
			.listen(config.port, console.log(`HTTPS server running on ${config.port}`));
	} else {
		app.listen(config.port, console.log(`HTTP server running on ${config.port}`));
	}
}

// Packages any file *.js within /observers directory
function loadObservers() {
	requireAll({
		dirname: path.join(__dirname, '/observers'),
		recursive: true
	});
}

function setUpChannels(whitelist) {
	if (whitelist) {
		debug(`Whitelist detected, only the following emails will be authorized: ${whitelist}`);
		const userlist = whitelist.map(email => ({primaryEmail: email}));
		return Promise.resolve(userlist)
			.then(createChannelsAndExtractIds);
	}
	return UserService.list()
		.then(resp => resp.users)
		.then(createChannelsAndExtractIds);
}

/**
 * Create User Directory Channel and extract User ids
 * @param  {Object} users JSON response for user directory response
 * @return {Void} n/a
 */
function createChannelsAndExtractIds(users) {
	findDirectoryChannel()
	// If existing channel exist renew it, otherwise create new and save
		.then(directoryChannel => directoryChannel ? directoryChannel : createDirChannelAndSave())
		.then(ChannelService.renew)
		.catch(debug);

	const userIds = extractUserIds(users);
	userIds.each(userId => {
		getEventChannelFromDB(userId)
			.then(channelDBEntry => {
				if (channelDBEntry) {
					debug('Found entry for %s', channelDBEntry.calendarId);
				}
				return channelDBEntry;
			})
			.then(eventChannel => (eventChannel) ? renewChannelAndResync(eventChannel) : createNewEventChannel(userId));
	})
	.catch(debug);
}

function renewChannelAndResync(eventChannel) {
	debug('Resyncing %s', eventChannel);
	// If the app has stopped, we use the previous syncToken and
	// resync and inform all our observers
	CalendarService
		.incrementalSync(eventChannel)
		.then(syncResp => {
			debug('Incremental sync: %o informing observers', syncResp);
			CalendarService
				.persistNewSyncToken(syncResp)
				.then(() => debug('Updated syncToken during resync'));

			return syncResp;
		})
		.then(syncResponse => eventController.emitEvents(syncResponse))
		.catch(err => handleInvaldTokenError(err, eventChannel));

	debug('Set renewal for %s', eventChannel);
	ChannelService.renew(eventChannel);
	return eventChannel;
}

function handleInvaldTokenError(err, eventChannel) {
	if (err.code === 410) {
		// Perform a full sync and update the syncToken in database
		// and emite any recent events
		debug(err.message);
		const calendarId = eventChannel.calendarId;

		CalendarService
			.fullSync(calendarId)
			.then(CalendarService.persistNewSyncToken)
			.then(syncResp => {
				// Update previous channel with new token and set future renewal and perform resync
				const updatedChannel = Object.assign({}, eventChannel, {nextSyncToken: syncResp.nextSyncToken});
				ChannelService.renew(updatedChannel);
				return syncResp;
			})
			.then(syncResponse => eventController.emitEvents(syncResponse));
	} else {
		debug(err.message);
	}
}

function createNewEventChannel(calendarId) {
	return ChannelService.create({calendarId, resourceType: 'event'})
		.then(ChannelService.save)
		.then(ChannelService.renew)
		.catch(debug);
}

/**
 * Get list of user ids from user records
 * @param  {Array} users an array of users from the Google directory response
 * @return {Object}       returns an extracted list of Google user ids
 */
function extractUserIds(users) {
	const userIds = _.map(users, user => user.primaryEmail);
	return Promise.resolve(userIds);
}

function createDirChannelAndSave() {
	return ChannelService
		.create({
			resourceType: 'directory'
		})
		.then(ChannelService.save)
		.catch(debug);
}

function getEventChannelFromDB(calendarId) {
	return Channel.findOne({calendarId});
}

function findDirectoryChannel() {
	return Channel.findOne({resourceType: 'directory'});
}

function removeExpiredChannels() {
	const channels = findNonMatchingExpiredChannel();
	channels.remove()
		.then(removed => removed.result.n > 0 ?
			debug('%s expired documents removed', removed.result.n) :
			null
		);
}

function findNonMatchingExpiredChannel() {
	// For the current being, this will remove any non matchinig configured URLs,
	// which limits the application to only handle 1 set desired URL.
	const query = {
		$or: [
			{
				expiration: {
					$lt: new Date()
				}
			},
			{
				webhookUrl: {
					$ne: config.receivingUrl.base
				}
			}
		]
	};
	return Channel.find(query);
}
