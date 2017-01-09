'use strict';

var _ = require('lodash');
require('dotenv').config();

var RECEIVING_URL = normalizeUrl(process.env.RECEIVING_URL);

var configs = {
  port: Number(process.env.PORT) || 5000,
  authorizeAdmin: process.env.ADMIN,
  webExDomain: process.env.WEBEX_DOMAIN,
  receivingUrl: {
    base: RECEIVING_URL,
    events: RECEIVING_URL + '/watch/events',
    users: RECEIVING_URL + '/watch/users'
  }
};

if (process.env.DOMAIN) {
  configs.domain = process.env.DOMAIN;
}

if (process.env.CUSTOMER) {
  configs.customer = process.env.CUSTOMER;
}

if (process.env.TTL) {
  configs.ttl = process.env.TTL;
}

_.forOwn(configs, function iterateConfigKeys(value, key) {
  if (!configs[key]) throwUndefined(value, key);
});

function throwUndefined(value, key) {
  if (!value) {
    throw new Error(key + ' is not defined in .env file');
  }
}

function normalizeUrl(receivingUrl) {
  if (typeof receivingUrl !== 'string') {
    throw new Error('Receiving URL is not defined');
  }

  // Check for trailing back slash
  if (receivingUrl.charAt(receivingUrl.length - 1) === '/') {
    return receivingUrl.substring(0, receivingUrl.length - 1);
  }
  return receivingUrl;
}

module.exports = configs;
