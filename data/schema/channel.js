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
 * @param  {[type]}   calendarId [description]
 * @param  {Function} callback   [description]
 * @return {[type]}              [description]
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
