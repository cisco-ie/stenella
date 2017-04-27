'use strict';

const google              = require('googleapis');
const calendar            = google.calendar('v3');
const directory           = google.admin('directory_v1');
const config              = require('../configs/config');
const scope               = require('../constants/GoogleScopes');
const _                   = require('lodash');
const Promise             = require('bluebird');
const mongoose            = require('mongoose');
const Channel             = mongoose.model('Channel', require('../data/schema/channel'));
const createJWT           = require('../services/AdministerJWT').createJWT;
const AdministerCalendars = require('./AdministerCalendars');
const getDateMsDifference = require('../libs/timeUtils').getDateMsDifference;
const debug = require('debug')('channel');

const Interface = {
  create: channelFactory,
  parseHeaders: parseHeaders,
  save: saveChannel,
  renew: renewChannel
};

module.exports = Interface;

/**
 * Acts as a initial factory, invoking function per type
 * @param  {object} channelInfo refer to properties listed below
 * @param  {string} channelInfo.resourceType  event or directory
 * @param  {object} channelInfo.calendarId   calendarId for event channel
 * @return {object}             Promise which is resolved to the channel information
 */
function channelFactory(channelInfo) {
  if (!channelInfo) throw new Error('No channel information presented');

  const factory = {
    directory: createDirectoryChannel,
    event: createEventChannel
  };

  return Promise.resolve(factory[channelInfo.resourceType](channelInfo));
}

function createEventChannel(channelInfo) {
  const eventChannelPromise = createChannel(channelInfo);
  const syncTokenPromise = AdministerCalendars.getSyncToken(channelInfo.calendarId);

  // We need to get the syncToken as a pointer in time
  // for calling the calendar.events.list(), thus it a
  // empty calendar.events.list() is called to extract it
  return Promise.all([
    syncTokenPromise,
    eventChannelPromise
  ])
    .spread((syncToken, eventChannel) => {
      eventChannel.syncToken = syncToken;
      eventChannel.type = 'event';
      return Promise.resolve(eventChannel);
    });
}

function createDirectoryChannel(channelInfo) {
  return createChannel(channelInfo);
}

/**
 * Create channels based on desired type
 * @param  {object} channelInfo contains type and associated id
 * @return {object} a promise for the channel being created
 */
function createChannel(channelInfo) {
  return new Promise((resolve, reject) => {
    // Creating a JWT in implementation,
    // as JWT can be expired on renewal
    switch (channelInfo.resourceType) {
    case 'event':
      debug('Creating "Event" channel for %s', channelInfo.calendarId);
      createJWT(scope.calendar)
        .then(jwtClient => {
          const params = buildParams(jwtClient, channelInfo);
	  debug('%O', params);
          calendar.events.watch(params, (err, res) => {
            if (err) reject(err);
	    debug('Sucessfully created event channel for %s %O', channelInfo.calendarId, res);
            if (res) {
              res.resourceType = 'event';
              res.calendarId = channelInfo.calendarId;
              resolve(res);
            }
          });
        })
        .catch(reject);
      break;

    case 'directory':
      debug('Creating "Directory" channel for %s', channelInfo.calendarId)      
      createJWT(scope.userDirectory)
        .then(jwtClient => {
          const params = buildParams(jwtClient, channelInfo);
          directory.users.watch(params, (err, res) => {
            if (err) reject(err);
            if (res) {
              res.resourceType = 'directory';
              resolve(res);
            }
          });
        })
        .catch(reject);
      break;

    default:
      throw new Error('Undeclared Type');
    }
  });
}

/**
 * Build parameters based on type
 * @param  {object} jwtClient   authenticated jwt client
 * @param  {object} channelInfo contains type and id
 * @return {object}             params for channel creation
 */
function buildParams(jwtClient, channelInfo) {
  let baseParams = {
    auth: jwtClient
  };
  const UUID = require('node-uuid').v4();
  let extendParams = {};

  if (channelInfo.resourceType === 'event') {
    extendParams = {
      calendarId: channelInfo.calendarId,
      payload: true,
      resource: {
        id: 'EVNT-' + UUID,
        type: 'web_hook',
        address: config.receivingUrl.events,
        params: {
          ttl: config.ttl || 1500
        }
      }
    };
  }

  if (channelInfo.resourceType === 'directory') {
    extendParams = {
      domain: config.domain,
      // Only care about new users,
      // deleted users will be ignored after expiration
      event: 'add',
      resource: {
        id: 'DIR-' + UUID,
        type: 'web_hook',
        address: config.receivingUrl.users,
        params: {
          ttl: 1500
        }
      }
    };
  }

  return _.merge(baseParams, extendParams);
}

/**
 * Returns a normalized object of the request header for notification request
 * @param  {object} request HTTP request
 * @return {object}         Normalized header object
 */
function parseHeaders(request) {
  const headers = request.headers;
  const channelObj = {
    channelId: headers['x-goog-channel-id'] || null,
    expiration: headers['x-goog-channel-expiration'] || null,
    messageNumber: headers['x-goog-message-number'] || null,
    resourceId: headers['x-goog-resource-id'] || null,
    resourceState: headers['x-goog-resource-state'] || null,
    resourceUri: headers['x-google-resource-uri'] || null
  };
  return channelObj;
}

/**
 * Saves channel to the database
 * @param  {Object} channelInfo Channel information
 * @return {Object}             Returns save channel
 */
function saveChannel(channelInfo) {
  if (!channelInfo) throw new Error('Undefined channel information');

  const props = {
    channelId: channelInfo.id || '',
    resourceId: '',
    syncToken: '',
    expiration: '',
    resourceType: channelInfo.resourceType || '',
    webhookUrl: config.receivingUrl.base
  };
  
  const channelProps = _.extend(props, channelInfo);
  let channelEntry = new Channel(channelProps);
  channelEntry.save();
  // Returning the virtual model to allow
  // deletions / updates to db, used for renewals
  return Promise.resolve(channelEntry);
}

function renewChannel(existingChannel) {
  const createAndDeleteChannel = () => {
    // Use the properties of the existing channel
    // for the new information
    channelFactory(existingChannel)
      .then(saveChannel)
      .then(deleteExistingAndRenew);
  };

  const deleteExistingAndRenew = (newChannel) => {
    const oldChannelId = existingChannel.channelId;
    debug('Deleted channel from DB: %s', oldChannelId);
    Channel.remove({ channelId: oldChannelId }).exec();
    debug('Renew channel in DB: %s', newChannel.channelId);
    renewChannel(newChannel);
  };

  // subtract 5 seconds (5000ms) to allow some overlap
  const timeoutMs = getTimeoutMs(existingChannel) - 5000;
  setTimeout(createAndDeleteChannel, timeoutMs);
}

function getTimeoutMs(channel) {
  const timeoutMs = getDateMsDifference(channel.expiration);
  if (timeoutMs < 0) return 0;
  return timeoutMs;
}

