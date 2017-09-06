const calendar = require('../controllers/eventController').observable;
const AdministerCalendars = require('../services/AdministerCalendars');
const debug = require('debug')('PMR Observer');
const CMR = 'airbnb';

calendar.subscribe(addPMRUrl);

function addPMRUrl(calendarEvent) {
	console.log(calendarEvent);
	if (!calendarEvent.summary) return;
	const summaryContainsWebex = calendarEvent.summary.match(/@webex/i);
	if (summaryContainsWebex) {
		const newlyCreatedMeeting = (calendarEvent.status === 'confirmed');
		if (newlyCreatedMeeting) {
			handleConfirmMeeting(calendarEvent);
		}
	}
}

function handleConfirmMeeting(calendarEvent) {
	const descriptionExist = calendarEvent.description;
	if (descriptionExist) {
		if (calendarEvent.description.indexOf('WebEx Details') > 0) {
			return;
		}
	}

	const existingDescription = (calendarEvent.description) ? calendarEvent.description : '';
	const updateInfo = {
		description: buildDescription(existingDescription, CMR, calendarEvent.userId),
		colorId: 9
	};

	const updatedEvent = Object.assign({}, calendarEvent, updateInfo);
	AdministerCalendars.updateEvent({
		calendarId: calendarEvent.calendarId,
		eventId: calendarEvent.id
	}, updatedEvent)
	.then(() => debug("Sucessfully update event."))
	.catch(debug);
}

function buildDescription(existingDescription, cmrSite, userId) {
	return `${existingDescription}
==== WebEx Details: Do Not Touch ====
http://${cmrSite}.webex.com/meet/${userId}`;
}

// /**
//  * Updates the calendar
//  * @param  {object} params eventId and calendarId
//  * @param  {object} updateInfo contains the event information update
//  * @param  {String} updateInfo.summary summary
//  * @param  {String} updateInfo.location location
//  * @param  {String} updateInfo.description description
//  * @param  {time} updateInfo.start start time
//  * @param  {time} updateInfo.end end time
//  * @return {Object} promise thenable promise
//  */
// function updateEvent(params, updateInfo) {
//   if (!params) throw new Error('Missing params for update Event');
//   var requiredParams = (params.eventId && params.calendarId);
//   if (!requiredParams) throw new Error('Missing required eventId or calendarId');

//   // Return if no updates to save redundant API request
//   if (!updateInfo) throw new Error('No update information passed');

//   params.resource = updateInfo;
//   return AdministerJWT.createJWT(scope.calendar)
//     .then(function jwtResponse(jwtClient) {
//       params.auth = jwtClient;
//       return Promise.promisify(calendar.events.update)(params);
//     });
// }

// {
// 	kind: 'calendar#event',
// 	etag: '"3006000164810000"',
// 	id: '1ie32u02p7nvunfgcg93jh5qid',
// 	status: 'cancelled',
// 	htmlLink: 'https://www.google.com/calendar/event?eid=MWllMzJ1MDJwN252dW5mZ2NnOTNqaDVxaWQgYnJoaW1AYXBpZGV2ZGVtby5jb20',
// 	created: '2017-08-17T19:57:23.000Z',
// 	updated: '2017-08-17T20:01:22.405Z',
// 	summary: 'Going to NAPA PTO',
// 	creator: { email: 'brhim@apidevdemo.com', self: true },
// 	organizer: { email: 'brhim@apidevdemo.com', self: true },
// 	start: { dateTime: '2017-08-17T13:00:00-07:00' },
// 	end: { dateTime: '2017-08-17T15:30:00-07:00' },
// 	iCalUID: '1ie32u02p7nvunfgcg93jh5qid@google.com',
// 	sequence: 1,
// 	reminders: { useDefault: true },
// 	calendarId: 'brhim@apidevdemo.com',
// 	userId: 'brhim'
// }
