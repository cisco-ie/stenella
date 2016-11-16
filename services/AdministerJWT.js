'use strict';

var google  = require('googleapis');
var Promise = require('bluebird');
var config  = require('../configs/config');

var Interface = {
  createJWT: createJWT
};

module.exports = Interface;

/**
 * Creates a JWT authorization and returns a promise
 * @param  {string|array} scope  a string of a url scope, a space-delimited string, or an array
 * @return {object}       promise of authorize Jwt
 */
function createJWT(scope) {
  return new Promise(function createJWTResponse(resolve, reject) {
    google.auth.getApplicationDefault(function getCredentialsResponse(err, authClient) {
      if (err) reject(err);

      if (authClient.createScopedRequired &&
          authClient.createScopedRequired()) {
        var scopedAuthClient = authClient.createScoped(scope);
        scopedAuthClient.subject = config.authorizeAdmin;
        scopedAuthClient.authorize(function authorizeJWTResponse(error) {
          if (error) reject(error);
          resolve(scopedAuthClient);
        });
      }
    });
  });
}
