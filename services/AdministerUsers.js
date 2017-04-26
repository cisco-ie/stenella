'use strict';

const google    = require('googleapis');
const _         = require('lodash');
const scope     = require('../constants/GoogleScopes');
const directory = google.admin('directory_v1');
const config    = require('../configs/config');
const Promise   = require('bluebird');
const AdministerJWT = require('../services/AdministerJWT');
const debug = require('debug')('users');

const Interface = {
  list: getUsers
};

module.exports = Interface;

/**
 * Invoke google api to get directory of users
 * @param  {object}   overrideParams <optional> parameters to retrieve users
 * @return {object} a promise that resolves into a user listing response
 */
function getUsers(overrideParams) {
  debug('Getting users');
  return new Promise(function userPromise(resolve, reject) {
    AdministerJWT.createJWT(scope.userDirectory)
      .then(function authorizeJwtResponse(jwtClient) {
        let params = buildParams(jwtClient, overrideParams);
        requestUserList(params)
          .then(resolve)
          .catch(reject);
      })
      .catch(console.log);
  });
}

function requestUserList(params) {
  const getDirectory = Promise.promisify(directory.users.list);

  // Returns a user listing response in the
  // cases of pagination, the response will
  // paginate, and append the users into
  // a single response
  return getDirectory(params)
    .then(function directoryListResponse(userResponse) {
      if (userResponse.nextPageToken) {
        const pageToken = userResponse.nextPageToken;
        params.pageToken = pageToken;
        // @TODO: Consider optimizing by returning
        // multiple response async
        return requestUserList(params)
          .then(function mergeResponse(paginatedResponse) {
	    debug('Merging user responses');
            const mergeUsers = _.concat(userResponse.users, paginatedResponse.users);
            let modifiedResponse = Object.create(userResponse);
            modifiedResponse.users = mergeUsers;
            return modifiedResponse;
          });
      }
      return userResponse;
    })
    .catch(function handleListError(error) {
      throw error;
    });
}

function buildParams(jwtClient, overrideParams) {
  let defaultParams = {
    auth: jwtClient,
    maxResults: 500,
    orderBy: 'email'
  };

  if (config.customer) {
    defaultParams.customer = config.customer;
  } else if (config.domain) {
    defaultParams.domain = config.domain;
  }

  const params = _.extend(defaultParams, overrideParams);
  return params;
}
