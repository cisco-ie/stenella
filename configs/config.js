const _ = require('lodash');
const fs = require('fs');
const path = require('path');
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
    config = Object.assign({}, config, { domain: env.DOMAIN });
  }

  if (env.CUSTOMER) {
    config = Object.assign({}, config, { customer: env.CUSTOMER });
  }

  if (env.TTL) {
    config = Object.assign({}, config, { ttl: env.TTL });
  }

  const throwError = (message) => {
    throw new Error(message);
  }

  _.forOwn(config, (value, key) => (!config[key]) ? throwError(`env.${key} is not defined`) : null);
  return config;
}

// Strips the "/" from a url if it is there or not
function _normalizeUrl(url) {
  if (typeof url !== 'string') {
    throw new Error('Receiving URL is not defined');
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

