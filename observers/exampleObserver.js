const calendarEvents = require('../controllers/eventController').observable;
calendarEvents.subscribe(catchPTOs);

function catchPTOs (calendarEvent) {
    console.log(calendarEvent);
  if (calendarEvent.summary.match(/PTO/g)) console.log('%s is on PTO', calendarEvent.userId);
}
