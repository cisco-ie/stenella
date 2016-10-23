'use strict';

/**
 * Variable Declarations
 */
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
 * @param  {string} scope string of scope url
 * @return {object}       promise of authorize Jwt
 */
function createJWT(scope) {
  var jwtClient = new google.auth.JWT(
      key.client_email, null, key.private_key, scope, config.authorizeAdmin);
  return authorize(jwtClient);
}

/**
 * Creates an authorization from the JWT Client
 * @param  {object} jwtClient signed JWT client_email
 * @return {object}           returns error or authenticated JWT client
 */
function authorize(jwtClient) {
  return new Promise(function createJWTpromise(resolve, reject) {
    jwtClient.authorize(function authorizeJwtResponse(error) {
      if (error) reject(error);
      resolve(jwtClient);
      }
    });
  });
}
