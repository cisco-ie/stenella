require('dotenv').config();

/**
 * Database Configurations
 * @type {Object}
 */
const dbConfigs = {
	// eslint-disable-next-line camelcase
	production_url: process.env.DB_URL,
	// eslint-disable-next-line camelcase
	test_url: process.env.DB_URL_TEST
};

if (!dbConfigs.production_url) {
	throw new Error('DB_URL is not defined');
}

module.exports = dbConfigs;
