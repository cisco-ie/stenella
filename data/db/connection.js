// Connection Configs
var mongoose = require('mongoose');
var config = require('../../configs/dbConfig');

mongoose.connect(config.url);

mongoose.connection.on('connected', function () {
  console.log('Mongoose default connection open to ' + config.url);
});

mongoose.connection.on('error', function (err) {
  console.log('Mongoose default connection error: ' + err);
  throw new Error(err);
});

mongoose.connection.on('disconnected', function () {
  console.log('Mongoose default connection disconnected');
});

// When server is terminated
process.on('SIGINT', function() {
  mongoose.connection.close(function () {
    console.log('Mongoose default connection disconnected due to server termination'); 
      process.exit(0);
  });
});
