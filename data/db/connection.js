const mongoose = require('mongoose');
const config = require('../../configs/dbConfig');

function connect(state) {
	const dbUrl = {
		test: config.test_url,
		production: config.production_url
	}[state || 'production'];

	const options = {
		server: {
			// eslint-disable-next-line camelcase
			auto_reconnect: true
		}
	};

	mongoose.connect(dbUrl, options);

	mongoose.connection.on('connected', () => console.log('Mongoose default connection open to', state));
	mongoose.connection.on('error', err => {
		console.log('Mongoose default connection error: ' + err);
		throw new Error(err);
	});
	mongoose.connection.on('disconnected', () => console.log('Mongoose default connection disconnected'));

	process.on('SIGINT', () => {
		mongoose.connection.close(() => {
			throw new Error('Mongoose default connection disconnected due to server termination');
		});
	});
}

module.exports = connect;
