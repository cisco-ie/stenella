// Events Controller
'use strict';

/**
 * Variable Declarations
 */
var logError = require('../libs/errorHandlers').logError;
var Promise = require('bluebird');
var channelSchema = require('../data/schema/channel');
var mongoose = require('mongoose');
var channel = mongoose.model('Channel', channelSchema);
var createJWT = require('../services/AdministerJWT').createJWT;
var scopes = require('../constants/GoogleScopes');

mongoose.Promise = require('bluebird');

/**
 * Events Controller Interface
 * @type {Object}
 */
var Interface = {
  load: load
};

module.exports = Interface;

/**
 * Loading to the controller based on Channel Id
 * @param  {String} channelId Channel Id recieved from the notification
 * @return {Void}
 */
function load(channelId) {
  getChannelEntry(channelId)
    .then(getIncrementalSync)
    .then(persistNewSyncToken)
    .then(parseEvents)
    .catch(logError);
}

/**
 * Returns the Channel Entry from Database
 * @param  {String} channelId string of channel entry
 * @return {Object}           Mongoose Virtual Model of Channel Entry
 */
function getChannelEntry(channelId) {
  return Channel.findOne({ channelId: channelId }).exec();
}

/**
 * Performs an incremental sync of the event list
 * @param  {Object} channelEntry Channel Database Entry
 * @return {Arrray}              List of Events
 */
function getIncrementalSync (channelEntry) {
  // a null entry = an old channelId that hasn't fully expired
  if (!channelEntry) throw new Error('channelId has been replaced with a newer channelId');
  return createJWT(scopes.calendar)
    .then(function jwtResponse(jwtClient) {
      var eventListParams = {
        id: channelEntry.resourceId,
        syncToken: channelEntry.syncToken
      };

      return getEventList(jwtClient, eventListParams);
    });
}

/**
 * [parseEvents description]
 * @param  {[type]} syncResponse [description]
 * @return {[type]}              [description]
 */
function parseEvents (syncResponse) {
  // Event list is order sensitive
  var eventList = _(syncResponse.items);
  eventList
    .forEach(eventFactory)
}

function persistNewSyncToken (syncResponse) {
  var query = {
    calendarId: syncResponse.summary
  };
  var update = {
    syncToken: syncResponse.nextSyncToken
  };
  return Subscription.update(query, update)
    .exec()
    .then(function (success) {
      return syncResponse;
    });
};

// This is logic redirection
// based on the event status
function eventFactory (event) {
  if (!event) return;
  return {
    cancelled: cancelEvent,
    confirmed: confirmEvent
  }[event.status](event);
}

function cancelEvent (event) {
  var details = WebExService.doesDetailsExist(event.description);
  if (!details) return;
  Event
    .findOne({ id: event.id })
    .then(deleteMeeting);
}

function confirmEvent (event) {
  if (!event.location) return;
  if (event.location.match(/@webex/i)) {
    var webExDetails = WebExService.doesDetailsExist(event.description);
    var header = WebExService.buildHeaderObj();
    var calendarClient = GoogleAuthService.getJwtClient(scopes.calendar);
    var bodyParams = {
      name: event.summary,
      startTime: event.start.dateTime,
      endTime: event.end.dateTime,
      password: Math.random().toString(36).substr(2, 9),
      attendees: event.attendees,
      xsiType: 'java:com.webex.service.binding.meeting.CreateMeeting'
    };

    if (webExDetails) {
      // Check to see if this is a pre-existing webex meeting
      // that needs to be cancelled

      // If it exist, check against our existing database for matching details
      Event.findOne({ id: event.id }, function (err, result) {
        if (!result) return;
        // Construct Date objects to match Mongo's Date wrapper within
        // Date Types.
        // 2016-08-19T16:00:00-07:00 -> Fri Aug 19 2016 11:17:26 GMT-0700
        var endDate = moment(event.end.dateTime).toString();
        var startDate = moment(event.start.dateTime).toString();

        // This will format the date object to remove the Timezone Abbreviations
        // Fri Aug 19 2016 11:17:26 GMT-0700 (PDT) -> Fri Aug 19 2016 11:17:26 GMT-0700
        var storedStart = result.start.toString().replace(/\([A-Z]+\)$/,"").trim();
        var storedEnd = result.end.toString().replace(/\([A-Z]+\)$/,"").trim();

        // If none of the existing details match, update the existing meeting
        if ((storedStart !== startDate) || (storedEnd !== endDate)) {
          bodyParams.xsiType = 'java:com.webex.service.binding.meeting.SetMeeting';
          var body = WebExService.buildBodyObj(bodyParams);
          var xml = WebExService.buildXml(header, body);

          createMeeting(bodyParams.password, event, xml);
        }
      });
    } else {
      var body = WebExService.buildBodyObj(bodyParams);
      var xml = WebExService.buildXml(header, body);
      createMeeting(bodyParams.password, event, xml);
      return;
    }
  }
}
