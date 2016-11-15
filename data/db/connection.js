// Connection Configs
var mongoose = require('mongoose');
var config = require('../../configs/dbConfig');

mongoose.connect(config.url);

mongoose.connection.on('connected', function connectedCb() {
  console.log('Mongoose default connection open to ' + config.url);
});

mongoose.connection.on('error', function errorCb(err) {
  console.log('Mongoose default connection error: ' + err);
  throw new Error(err);
});

mongoose.connection.on('disconnected', function disconnectedCb() {
  console.log('Mongoose default connection disconnected');
});

// When server is terminated
process.on('SIGINT', function serverTerminatedCb() {
  mongoose.connection.close(function mongoTerminatedCb() {
    throw new Error('Mongoose default connection disconnected due to server termination');
  });
});
