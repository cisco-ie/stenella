/**
 * Variable Declarations
 */
var mongoose = require('mongoose');
var Schema   = mongoose.Schema;

/**
 * Channel Schema
 */
var channelSchema = new Schema({
  calendarId: String,
  channelId: String,
  resourceId: String,
  syncToken: String,
  expiration: Date,
  resourceType: String,
  webhookUrl: String
});

/**
 * A synchronous token return
 * @TODO: Change this based on schema update on finalized schema
 * @param  {string}   calendarId calendarId
 * @param  {Function} callback   callback function
 * @return {function}             returns a callback
 */
channelSchema.statics.getSyncToken = function getSyncToken(calendarId, callback) {
  var query = {
    calendarId: calendarId
  };
  var returnFields = 'calendarId, syncToken';
  this.model().find(query, returnFields, function findResponse(err, subscription) {
    callback(err, subscription[0].syncToken);
  });
};

module.exports = channelSchema;
