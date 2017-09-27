const expect = require('chai').expect;
const eventController = require('../controllers/event-controller');

const eventsMock = require('./mocks/eventList.json');
const eventsMock2 = require('./mocks/eventList2.json');
const eventsMock3 = require('./mocks/eventList3.json');
// Uncomment once code is revised
// const eventsMock4 = require('./mocks/eventList4.json');

describe('Event Controller', () => {
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

	it('should remove any old events', done => {
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

	const events = eventController._parseEvents(eventsMock);

	it('should remove attendees without modifying abilities', done => {
		const updatedEvents = eventController._removeNonCapableAttendees(events);

		expect(updatedEvents.length).to.equal(2);
		expect(updatedEvents[0].id).to.equal('event-1');
		expect(updatedEvents[1].id).to.equal('event-3');

		const none = eventController._removeNonCapableAttendees({});
		expect(none).to.deep.equal({});
		done();
	});

	it('should check against existing cache', done => {
		// Pass it through the initial parser as this is used within the load event
		const events2 = eventController._parseEvents(eventsMock2);
		eventController._checkAgainstCache(eventsMock2.items);
		// In the mock we have a identical event to eventsMock1
		const duplicatedEvents = eventController._checkAgainstCache(events2);
		expect(duplicatedEvents.length).to.equal(0);

		const mock3 = eventController._parseEvents(eventsMock3);
		const newerEvents = eventController._checkAgainstCache(mock3);
		expect(newerEvents.length).to.equal(1);
		expect(newerEvents[0].summary).to.equal('Newer Event Should Pass Filter');

		// Will re-add
		// const mock4 = eventController._parseEvents(eventsMock4);
		// const olderEvents = eventController._checkAgainstCache(mock4);
		done();
	});
});
