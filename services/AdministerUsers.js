'use strict';

/**
 * Retrieve the user directories from google api
 */
var google = require('googleapis');
var _ = require('lodash');
var directory = google.admin('directory_v1');
var config = require('../configs/config');

var Interface = {
  list: getUsers
};

module.exports = Interface;

/**
 * Invoke google api to get directory of users
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
