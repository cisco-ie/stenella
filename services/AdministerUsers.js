'use strict';

var google    = require('googleapis');
var _         = require('lodash');
var scope     = require('../constants/GoogleScopes');
var directory = google.admin('directory_v1');
var config    = require('../configs/config');
var Promise   = require('bluebird');
var createJWT = require('../services/AdministerJWT').createJWT;

var Interface = {
  list: getUsers
};

module.exports = Interface;

/**
 * Invoke google api to get directory of users
 * @param  {object}   overrideParams <optional> parameters to retrieve users
 * @return {object} a promise that resolves into a user listing response
 */
function getUsers(overrideParams) {
  return new Promise(function userPromise(resolve, reject) {
    createJWT(scope.userDirectory)
      .then(function authorizeJwtResponse(jwtClient) {
        var params = buildParams(jwtClient, overrideParams);
        requestUserList(params)
          .then(resolve)
          .catch(reject);
      })
      .catch(console.log);
  });
}

function requestUserList(params) {
  var directoryList = Promise.promisify(directory.users.list);

  // Returns a user listing response in the
  // cases of pagination, the response will
  // paginate, and append the users into
  // a single response
  return directoryList(params)
    .then(function directoryListResponse(userResponse) {
      if (userResponse.nextPageToken) {
        var pageToken = userResponse.nextPageToken;
        params.pageToken = pageToken;
        // @TODO: Consider optimizing by returning
        // multiple response async
        return requestUserList(params)
          .then(function mergeResponse(paginatedResponse) {
            var mergeUsers = _.concat(userResponse.users,
                                      paginatedResponse.users);
            userResponse.users = mergeUsers;
            return userResponse;
          });
      }
      return userResponse;
    })
    .catch(function handleListError(error) {
      throw error;
    });
}

function buildParams(jwtClient, overrideParams) {
  var defaultParams = {
    auth: jwtClient,
    maxResults: 500,
    orderBy: 'email'
  };

  if (config.customer) {
    defaultParams.customer = config.customer;
  } else if (config.domain) {
    defaultParams.domain = config.domain;
  }

  var params = _.extend(defaultParams, overrideParams);
  return params;
}
