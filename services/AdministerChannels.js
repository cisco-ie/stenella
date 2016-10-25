'use strict';

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

var Interface = {
  create: createChannel,
  parseHeaders: parseHeaders,
  save: saveChannel
};

module.exports = Interface;

/**
 * Create channels based on desired type
 * @param  {object} jwtClient   authenticated jwtClient
 * @param  {object} channelInfo contains type and associated id
 * @return {void}
 */
function createChannel(channelInfo) {
  return new Promise(function (resolve, reject) {
    // Create JWT in implementation,
    // as JWT can be expired on renewal
    switch (channelInfo.type) {
    case 'event':
      createJWT(scope.calendar)
        .then(function JwtResponse(jwtClient) {
          var params = buildParams(jwtClient, channelInfo);
          calendar.events.watch(params, function calWatchCallback(err, res) {
            if (err) reject(err);
            if (res) resolve(res);
          });
        })
      // @TODO: Create retry here
      // .catch(function holdOffAndRecall() {
      //   async.retry({
      //     times: 10,
      //     interval: function(retryCount) {
      //       // Exponential back-off
      //       return 50 * Math.pow(2, retryCount);
      //     }
      //   }, createEventChannelsAndSave(userId));
      // });
        .catch(reject);
      break;

    case 'directory':
      createJWT(scope.userDirectory)
        .then(function JwtResponse(jwtClient) {
          var params = buildParams(jwtClient, channelInfo);
          directory.users.watch(params, function dirWatchCallback(err, res) {
            if (err) reject(err);
            if (res) resolve(res);
          });
        })
        .catch(reject);
      break;

    default:
      return new Error('Undeclared Type');
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
      // Only care about new users,
      // deleted users will be ignored after expiration
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
  console.log(channelInfo);
  if (!channelInfo) return new Error('Undefined channel information');
  var props = {
    channelId: channelInfo.id || '',
    resourceId: '',
    syncToken: '',
    expiration: '',
    resourceType: channelInfo.type || ''
  };
  var channelProps = _.extend(props, channelInfo);
  var channelEntry = new Channel(channelProps);
  channelEntry.save();
}

function setRenewalChannel(channelId, expiration) {
  function findTimeLeft(expiryTime) {
    return ((new Date()) - (new Date(expiryTime)));
  }
}
