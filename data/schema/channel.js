/**
 * Variable Declarations
 */
var mongoose = require('mongoose'),
  Schema = mongoose.Schema,

/**
 * Channel Schema
 */
var channelSchema = new Schema({
  channelId: String,
  calendarId: String,
  resourceId: String,
  syncToken: String,
  expiration: Date
});

/**
 * A synchronous token return
 * @TODO: Change this based on schema update on finalized schema
 * @param  {string}   calendarId calendarId
 * @param  {Function} callback   callback function
 * @return {function)              returns a callback 
 */
channelSchema.methods.getSyncToken = function (calendarId, callback) {
  var query = {
    calendarId: calendarId
  }

  this.model(modelName).find(query, 'calendarId, syncToken' , function (err, subscription) {
    callback(err, subscription[0].syncToken);
  });
};

module.exports = channelSchema;
