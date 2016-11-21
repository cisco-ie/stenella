require('dotenv').config();

/**
 * Database Configurations
 * @type {Object}
 */
var dbConfigs = {
  production_url: process.env.DB_URL,
  test_url: process.env.DB_URL_TEST
};

if (!dbConfigs.production_url) {
  throw new Error('DB_URL is not defined');
}

module.exports = dbConfigs;
