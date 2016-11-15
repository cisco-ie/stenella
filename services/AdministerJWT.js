'use strict';

var google = require('googleapis');
var Promise = require('bluebird');
var config = require('../configs/config');
var key = config.keys.server;

var Interface = {
  createJWT: createJWT
};

module.exports = Interface;

/**
 * Creates a JWT authorization and returns a promise
 * @param  {string|array} a string of a url scope, a space-delimited string, or an array
 * @return {object}       promise of authorize Jwt
 */
function createJWT(scope) {
  return new Promise(function createJWTResponse(resolve, reject) {
    google.auth.getApplicationDefault(function(err, authClient) {
      if (err) reject (err);

      if (authClient.createScopedRequired &&
          authClient.createScopedRequired()) {
        authClient = authClient.createScoped(scope);
        authClient.subject = config.authorizeAdmin;
        authClient.authorize(function authorizeJWTResponse(error) {
          if (error)
            reject(error);
          resolve(authClient);
        });
      }
    });
  });
}
