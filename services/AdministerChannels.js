'use strict'

/**
 * Retrieve the user calendars from google api
 */
var google = require('googleapis');
var calendar = google.calendar('v3');
var directory = google.admin('directory_v1');

/**
 * API to administer Channels
 */
var Interface = {
  createChannel: createChannel
};


function createChannel(type, timeout) {
  var timeout = timeout || 0;
  setTimeout(function () {

  }, timeout);
  switch (type) {
    case 'event': break;
    case 'directory': break;
    default:
      return new Error('undeclared Type!')
  }
}
