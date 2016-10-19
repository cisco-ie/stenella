require('dotenv').config();

var dbConfigs = {
  url: process.env.DB_URL
}

if (!dbConfigs.url) {
  throw new Error('DB_URL is not defined');
}

module.exports = dbConfigs;
