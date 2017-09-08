const expect = require('chai').expect;
const sinon = require('sinon');
const eventsMock = require('./mocks/eventList.json');
const eventController = require('../controllers/eventController');

describe('Event Controller', function EventControllerTest() {
	it('should get the user from the email', done => {
		const parseUserIdFromEmail = eventController._parseUserIdFromEmail;

		const testEmail1 = 'squirtle@live.com';
		const actualEmail1 = parseUserIdFromEmail(testEmail1);
		expect(actualEmail1).to.equal('squirtle');

		const testEmail2 = 'charmander@live.com';
		const actualEmail2 = parseUserIdFromEmail(testEmail2);
		expect(actualEmail2).to.equal('charmander');

		done();
	});

	it('should remove any old events', (done) => {
		const events = [
			{
				id: 1,
				title: 'newest event'
			},
			{
				id: 1,
				title: 'oldest Event'
			},
			{
				id: 2,
				title: 'non relevant event'
			}
		];

		const filteredEvents = events.filter(eventController._filterForLatestEvents);
		expect(filteredEvents).to.deep.equal([events[0], events[2]]);
		done();
	});

	it('should remove attendees without modifying abilities', done => {
		const events = eventController._parseEvents(eventsMock);
		const updatedEvents = eventController._removeNonCapableAttendees(events);

		expect(updatedEvents.length).to.equal(2);
		expect(updatedEvents[0].id).to.equal('event-1');
		expect(updatedEvents[1].id).to.equal('event-3');

		const none = eventController._removeNonCapableAttendees({});
		expect(none).to.deep.equal({});
		done();
	});

	it('should check against cache', done => {
	   sinon.stub(eventController, "emitEvents");
	// 	sinon.stub(eventController, "_getChannelEntry").return(Promise.resolve())
	// 	eventController.load();
	// 	asset(eventController.emitEvents.calledWithMatch({}));
	});
});

const mockChannelEntry = {
	_id: "59b07027c463f671f096de92",
	channelId: 'EVNT-ce6d5e90-d1bb-4332-867d-8bfaa30d1608',
	resourceId: 'Ot03kc_DoEu1bzaySAzuFxAFUH8',
	syncToken: 'CPjQ6a3MkdYCEPjQ6a3MkdYCGAU=',
	expiration: "2017-09-06T22:26:08.000Z",
	resourceType: 'event',
	webhookUrl: 'https://brandonhim.ngrok.io',
	calendarId: 'brhim@apidevdemo.com',
	__v: 0
}