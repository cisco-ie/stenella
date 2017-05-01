const calendarEvents = require('../controllers/eventController').observable;
calendarEvents.subscribe(catchPTOs);

function catchPTOs (calendarEvent) {
  console.log(calendarEvent);
  const PTOEvent = calendarEvent.summary.match(/PTO/g).length > 0;
  if (PTOEvent) console.log('%s is on PTO', calendarEvent.userId);
}
