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
});
