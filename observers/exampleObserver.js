const calendarEvents = require('../controllers/event-controller').observable;
calendarEvents.subscribe(catchPTOs);

function catchPTOs (calendarEvent) {
	const verbType = {
		confirmed: 'new/updated',
		cancelled: 'cancelled'
	};

	const verb = verbType[calendarEvent.status];

	const output = `${calendarEvent.userId} has a ${verb} event.
Summary: ${calendarEvent.summary}
Date: ${calendarEvent.start.dateTime}`;

	if (calendarEvent.summary.match(/@example/ig)) console.log(output);
}
