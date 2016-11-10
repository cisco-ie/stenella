require('dotenv').config();

/**
 * Database Configurations
 * @type {Object}
 */
var dbConfigs = {
  url: process.env.DB_URL
};

if (!dbConfigs.url) {
  throw new Error('DB_URL is not defined');
}

module.exports = dbConfigs;
