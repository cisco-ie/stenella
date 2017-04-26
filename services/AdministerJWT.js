'use strict';

const google  = require('googleapis');
const Promise = require('bluebird');
const config  = require('../configs/config');
const debug = require('debug')('jwt');

const Interface = {
  createJWT: createJWT
};

module.exports = Interface;

/**
 * Creates a JWT authorization and returns a promise
 * @param  {string|array} scope  a string of a url scope, a space-delimited string, or an array
 * @return {object}       promise of authorize Jwt
 */
function createJWT(scope) {
  return new Promise((resolve, reject) => {
    google.auth.getApplicationDefault((err, authClient) => {
      debug('Attempting to authenticate for %s', scope);
      if (err) throw err;
      if (authClient.createScopedRequired && authClient.createScopedRequired()) {
	debug('Established JWT');
        let scopedAuthClient = authClient.createScoped(scope);
        scopedAuthClient.subject = config.authorizeAdmin;
        scopedAuthClient.authorize((error) => (error)
				   ? reject(error) : resolve(scopedAuthClient));
      }
    });
  });
}
