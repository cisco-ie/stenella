'use strict';

/**
 * Retrieve the user directories from google api
 */
var google = require('googleapis');
var _ = require('lodash');
var directory = google.admin('directory_v1');
var config = require('../configs/config');

/**
 * API to administer User Directory
 */
var Interface = {
  list: getUsers
};

module.exports = Interface;

/**
 * invoke google api to get directory of users
 * @param  {object}   authToken <required> secure JWT for user directories
 * @param  {object}   userParams <optional> parameters to retrieve users
 * @param  {Function} callback   for google's directory response
 * @return {function} invokes callback
 */
function getUsers(authToken, userParams, callback) {
  // @TODO: add support for pagination under Utilities
  // @TODO: consider customer id in liu of domain & introduce page token
  if (!authToken) return callback(new Error('No auth token provided'));
  var defaultParams = {
    auth: authToken,
    domain: config.domain,
    maxResults: 500,
    orderBy: 'email'
  };
  var params = _.extend(defaultParams, userParams);
  return directory.users.list(params, callback);
}

// function createUserChannel(authToken, params, callback) {
//   if (!authToken) return callback(new Error('No auth token provided'));
//   var defaultParams = {
//     auth: client,
//     domain: config.domain,
//     // Only care about new additions, deleted ones will fall off over time
//     event: 'add',
//     resource: {
//       id: UUID,
//       type: 'web_hook',
//       address: config.recievingUrl.users,
//       params: {
//         ttl: 6400 // 2 hour
//       }
//     }
//   };
//   var params = _.merge(defaultParams, params);
//   return directory.users.watch(params, callback);
// }

function findTimeLeft(expiryTime) {
  return ((new Date()) - (new Date(expiryTime)));
}

function setChannelRenewal(expiryTime) {
  setTimeout(function () {

  }, findTimeLeft(expiryTime));
}
