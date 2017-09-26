const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const dotenv = require('dotenv');

// Load the .env file into process.env
dotenv.config();

function build(env) {
	const RECEIVING_URL = _normalizeUrl(env.RECEIVING_URL);

	let config = {
		port: Number(env.PORT) || 5000,
		authorizeAdmin: env.ADMIN,
		receivingUrl: {
			base: RECEIVING_URL,
			events: RECEIVING_URL + '/watch/events',
			users: RECEIVING_URL + '/watch/users'
		}
	};

	if (env.DOMAIN) {
		config = Object.assign({}, config, {domain: env.DOMAIN});
	}

	if (env.CUSTOMER) {
		config = Object.assign({}, config, {customer: env.CUSTOMER});
	}

	if (env.TTL) {
		config = Object.assign({}, config, {ttl: env.TTL});
	}

	if (env.USER_WHITELIST_PATH) {
		// Set to app root
		const listPath = path.join('../', env.USER_WHITELIST_PATH);
		config = Object.assign({}, config, {whitelist: require(listPath)});
	}

	if (env.PRIVATE_KEY_PATH && env.FULL_CHAIN_CERT_PATH) {
		const privateKey = env.PRIVATE_KEY_PATH;
		const cert = env.FULL_CHAIN_CERT_PATH;
		const sslOptions = (env.CERT_PASSPHRASE) ?
			{privateKey, cert, passphrase: env.CERT_PASSPHRASE} :
			{privateKey, cert};
		config = Object.assign({}, config, {sslOptions, ssl: true});
	}

	const throwError = message => {
		throw new Error(message);
	};

	_.forOwn(config, (value, key) => (config[key]) ? null : throwError(`env.${key} is not defined`));
	return config;
}

// Strips the "/" from a url if it is there or not
function _normalizeUrl(url) {
	if (!url) {
		throw new Erorr('Expected url to be defined');
	}

	// Check for trailing back slash
	if (url.charAt(url.length - 1) === '/') {
		return url.substring(0, url.length - 1);
	}
	return url;
}

const _buildAppConfig = () => {
	if (process.env.ENVIRONMENT === 'TEST') {
		const exampleBuff = fs.readFileSync(path.join(__dirname, '..', 'example.env'));
		const parseExample = dotenv.parse(exampleBuff);
		return build(parseExample);
	}
	return build(process.env);
};

module.exports = {
	APP: _buildAppConfig(),
	_normalizeUrl,
	build
};
