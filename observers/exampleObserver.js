const calendarEvents = require('../controllers/eventController').observable;
calendarEvents.subscribe(catchPTOs);

function catchPTOs (calendarEvent) {
  if (calendarEvent.summary.match(/PTO/g)) console.log('%s is on PTO', calendarEvent.creator.email);
}
