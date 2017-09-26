'use strict';

const google = require('googleapis');
const _ = require('lodash');
const Promise = require('bluebird');
const scope = require('../constants/GoogleScopes');
const config = require('../configs/config').APP;
const {createJWT} = require('../services/AdministerJWT');

const directory = google.admin('directory_v1');
// eslint-disable-next-line no-use-extend-native/no-use-extend-native
const getDirectory = Promise.promisify(directory.users.list);

const Interface = {
	list: getUsers,
	buildParams,
	requestUserList
};

module.exports = Interface;

/**
 * Invoke google api to get directory of users
 * @param  {object}   overrideParams <optional> parameters to retrieve users
 * @return {object} a promise that resolves into a user listing response
 */
function getUsers(overrideParams) {
	return new Promise((resolve, reject) => {
		createJWT(scope.userDirectory)
			.then(jwtClient => buildParams(jwtClient, overrideParams))
			.then(params => requestUserList(params))
			.then(resolve)
			.catch(reject);
	});
}

function requestUserList(params) {
	// Returns a user listing response in the
	// cases of pagination, the response will
	// paginate, and append the users into
	// a single response
	return getDirectory(params)
		.then(userResponse => {
			if (userResponse.nextPageToken) {
				const pageToken = userResponse.nextPageToken;
				params.pageToken = pageToken;
				// @TODO: Consider optimizing by returning
				// multiple response async

				return requestUserList(params)
					.then(paginatedResponse => {
						const mergeUsers = _.concat(userResponse.users, paginatedResponse.users);
						const modifiedResponse = Object.create(userResponse);
						modifiedResponse.users = mergeUsers;
						return modifiedResponse;
					});
			}
			return userResponse;
		})
		.catch(err => {
			throw err;
		});
}

function buildParams(jwtClient, overrideParams) {
	const defaultParams = {
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
