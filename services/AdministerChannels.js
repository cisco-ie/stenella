'use strict';

/**
 * Retrieve the user calendars from google api
 */
var google = require('googleapis');
var calendar = google.calendar('v3');
var directory = google.admin('directory_v1');
var config = require('../configs/config');
var scope = require('../constants/GoogleScopes');
var _ = require('lodash');
var Promise = require('bluebird');
var mongoose = require('mongoose');
var Channel = mongoose.model('Channel', require('../data/schema/channel'));
var createJWT = require('../services/AdministerJWT').createJWT;
var logError = require('../libs/errorHandlers').logError;

/**
 * API to administer Channels
 */
var Interface = {
  create: createChannel,
  parseHeaders: parseHeaders,
  save: saveChannel
};

module.exports = Interface;

/**
 * Create channels based on desired type
 * @param  {object} jwtClient   authenticated jwt client
 * @param  {object} channelInfo contains type and associated id
 * @param  {number} timeout     delay duration before creating channelInfo
 * @return {void}
 */
function createChannel(channelInfo, timeout) {
    var timeout = timeout || 0;
    return new Promise(function (resolve, reject) {
      setTimeout(function channelTimeout() {
        // Create JWT in implementation, n
        // as JWT can be expired on renewal
        switch (channelInfo.type) {
        case 'event':
          createJWT(scope.calendar)
            .then(function JwtResponse(jwtClient) {
              var params = buildParams(jwtClient, channelInfo);
              console.log(params);
              var setCalendarWatch = Promise.promisify(calendar.events.watch);
              setCalendarWatch(params)
                .catch(function(err) { console.log (err);});
            });

        case 'directory':
          createJWT(scope.userDirectory)
            .then(function JwtResponse(jwtClient) {
              var params = buildParams(jwtClient, channelInfo);
              var setDirectoryWatch = Promise.promisify(directory.users.watch);
              resolve(setDirectoryWatch(params));
            });

        default:
          return new Error('Undeclared Type');
        }
      }, timeout);
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
  if (channelInfo.type === 'event') {
    extendParams = {
      calendarId: channelInfo.id,
      payload: true,
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

/**
 * Saves channel to the database
 * @param  {Object} channelInfo Channel information
 * @return {Object}             Returns save channel
 */
function saveChannel(channelInfo) {
  console.log('saveechanne')
  console.log(channelInfo);
  var props = {
    channelId: '',
    resourceId: '',
    syncToken: '',
    expiration: '',
    resourceType: ''
  };

  _.extend(props, channelInfo);
  var channelEntry = new Channel(props);

  channelEntry.save(logError);
}

function setRenewalChannel(channelId, expiration) {
  function findTimeLeft(expiryTime) {
    return ((new Date()) - (new Date(expiryTime)));
  }
}
