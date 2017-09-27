const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const channelSchema = new Schema({
	calendarId: String,
	channelId: String,
	resourceId: String,
	syncToken: String,
	expiration: Date,
	resourceType: String,
	webhookUrl: String
});

module.exports = channelSchema;
