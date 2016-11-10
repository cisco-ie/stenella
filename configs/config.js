'use strict';

var _ = require('lodash');
require('dotenv').config();

/**
 * Build the service credentials to be applied to configs
 * @type {Object}
 */
var serviceCreds = {
  type: 'service_account',
  project_id: process.env.PROJECT_ID,
  private_key_id: process.env.PRIVATE_KEY_ID,
  // TODO: Revisit why storing in .env is not working
  private_key: require('../keys/service_account_secret.json').private_key,
  client_email: process.env.CLIENT_EMAIL,
  client_id: process.env.CLIENT_ID,
  auth_uri: 'https://accounts.google.com/o/oauth2/auth',
  token_uri: 'https://accounts.google.com/o/oauth2/token',
  auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
  client_x509_cert_url: process.env.CLIENT_X509_CERT_URL
};


var configs = {
  port: Number(process.env.PORT) || 5000,
  authorizeAdmin: process.env.ADMIN,
  domain: process.env.DOMAIN,
  keys: {
    // Set created serviceCreds here
    server: serviceCreds
  },
  recievingUrl: {
    events: process.env.RECIEVING_URL + 'watch/events',
    users: process.env.RECIEVING_URL + 'watch/users'
  }
};

// Need to throw error if a value is undefined
// @TODO: Resolve Lint Errors
_.forOwn(configs, function(value, key) {
  if (key === 'keys') {
    // Search within key server as well
    _.forOwn(key.server, function(kvalue, keyval) {
      throwUndefined(kvalue, keyval);
    });
  }

  throwUndefined(value, key);
});

function throwUndefined(value, key) {
  if (!value) {
    throw new Error(key + ' is not defined');
  }
}

module.exports = configs;
