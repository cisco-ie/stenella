'use strict';

var _ = require('lodash');
require('dotenv').config();

var configs = {
  port: Number(process.env.PORT) || 5000,
  authorizeAdmin: process.env.ADMIN,
  domain: process.env.DOMAIN,
  recievingUrl: {
    events: process.env.RECIEVING_URL + 'watch/events',
    users: process.env.RECIEVING_URL + 'watch/users'
  }
};

_.forOwn(configs, function iterateConfigKeys(value, key) {
  if (key === 'keys') throwUndefined(value, key);
});

function throwUndefined(value, key) {
  if (!value) {
    throw new Error(key + ' is not defined');
  }
}

module.exports = configs;
