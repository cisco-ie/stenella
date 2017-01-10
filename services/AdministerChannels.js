'use strict';

var google              = require('googleapis');
var calendar            = google.calendar('v3');
var directory           = google.admin('directory_v1');
var config              = require('../configs/config');
var scope               = require('../constants/GoogleScopes');
var _                   = require('lodash');
var Promise             = require('bluebird');
var mongoose            = require('mongoose');
var Channel             = mongoose.model('Channel', require('../data/schema/channel'));
var createJWT           = require('../services/AdministerJWT').createJWT;
var AdministerCalendars = require('./AdministerCalendars');
var getDateMsDifference = require('../libs/timeUtils').getDateMsDifference;

var Interface = {
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

  var factory = {
    directory: createDirectoryChannel,
    event: createEventChannel
  };

  return Promise.resolve(factory[channelInfo.resourceType](channelInfo));
}

function createEventChannel(channelInfo) {
  var eventChannelPromise = createChannel(channelInfo);
  var syncTokenPromise = AdministerCalendars.getSyncToken(channelInfo.calendarId);

  // We need to get the syncToken as a pointer in time
  // for calling the calendar.events.list(), thus it a
  // empty calendar.events.list() is called to extract it
  return Promise.all([
    syncTokenPromise,
    eventChannelPromise
  ])
  .spread(function syncTokenAndChannelResolve(syncToken, eventChannel) {
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
  return new Promise(function createChannelPromise(resolve, reject) {
    // Creating a JWT in implementation,
    // as JWT can be expired on renewal
    switch (channelInfo.resourceType) {
    case 'event':
      createJWT(scope.calendar)
        .then(function JwtResponse(jwtClient) {
          var params = buildParams(jwtClient, channelInfo);
          calendar.events.watch(params, function calWatchCallback(err, res) {
            if (err) reject(err);
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
      createJWT(scope.userDirectory)
        .then(function JwtResponse(jwtClient) {
          var params = buildParams(jwtClient, channelInfo);
          directory.users.watch(params, function dirWatchCallback(err, res) {
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
  var baseParams = {
    auth: jwtClient
  };
  var UUID = require('node-uuid').v4();
  var extendParams = {};

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
  var headers = request.headers;
  var channelObj = {
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

  var props = {
    channelId: channelInfo.id || '',
    resourceId: '',
    syncToken: '',
    expiration: '',
    resourceType: channelInfo.resourceType || '',
    webhookUrl: config.receivingUrl.base
  };
  var channelProps = _.extend(props, channelInfo);
  var channelEntry = new Channel(channelProps);
  channelEntry.save();
  // Returning the virtual model to allow
  // deletions / updates to db, used for renewals
  return Promise.resolve(channelEntry);
}

function renewChannel(existingChannel) {
  // subtract 5 seconds (5000ms) to allow some overlap
  var timeoutMs = getTimeoutMs(existingChannel) - 5000;
  setTimeout(createAndDeleteChannel, timeoutMs);

  function createAndDeleteChannel() {
    // Use the properties of the existing channel
    // for the new information
    channelFactory(existingChannel)
      .then(saveChannel)
      .then(deleteExistingAndRenew);
  }

  function deleteExistingAndRenew(newChannel) {
    var oldChannelId = existingChannel.channelId;
    Channel.remove({ channelId: oldChannelId }).exec();

    renewChannel(newChannel);
  }
}

function getTimeoutMs(channel) {
  var timeoutMs = getDateMsDifference(channel.expiration);
  if (timeoutMs < 0) return 0;
  return timeoutMs;
}
