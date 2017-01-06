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

module.exports = channelSchema;
