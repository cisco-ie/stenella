'use strict';

/**
 * Retrieve the user calendars from google api
 */
var google = require('googleapis');
var calendar = google.calendar('v3');
var directory = google.admin('directory_v1');
var config = require('../configs/config');
var _ = require('lodash');

/**
 * API to administer Channels
 */
var Interface = {
  createChannel: createChannel,
  parseHeaders: parseHeaders
};

module.exports = Interface;

/**
 * Create channels based on desired type
 * @param  {object} jwtClient   authenticated jwt client
 * @param  {object} channelInfo contains type and associated id
 * @param  {number} timeout     delay duration before creating channelInfo
 * @return {void}
 */
function createChannel(jwtClient, channelInfo, timeout) {
  var timeout = timeout || 0;
  setTimeout(function () {
    console.log(channelInfo);
    switch (channelInfo.type) {
    case 'event':
      var params = buildParams(jwtClient, channelInfo);
      // @TODO: create a callback for failed creations
      calendar.events.watch(params, function(err, response) { console.log(response); console.log(err);});
      break;

    case 'directory':
      var params = buildParams(jwtClient, channelInfo);
      directory.users.watch(params, function(err, response) { console.log(response); console.log(err);});
      break;

    default:
      return new Error('Undeclared Type');
    }
  }, timeout);
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

  var extendParams = '';
  if (channelInfo.type === 'event') {
    extendParams = {
      calendarId: channelInfo.id,
      showDeleted: true,
      payload: true,
      fields: 'id, expiration', // Only because we only want to confirm it has been successful
      resource: {
        id: 'EVNT-' + UUID,
        type: 'web_hook',
        address: config.recievingUrl.events,
        params: {
          // @TODO: create config for TTL
          ttl: 6400 // 2 hour
        }
      }
    };
  }

  if (channelInfo.type === 'directory') {
    extendParams = {
      domain: config.domain,
      // Only care about new additions, deleted ones will fall off over time
      event: 'add',
      resource: {
        id: 'DIR-' + UUID,
        type: 'web_hook',
        address: config.recievingUrl.users,
        params: {
          ttl: 6400 // 2 hour
        }
      }
    };
  }

  // Extend base params with the custom extended params
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
};

function setRenewalChannel(channelId, expiration) {
  function findTimeLeft(expiryTime) {
    return ((new Date()) - (new Date(expiryTime)));
  }
}


