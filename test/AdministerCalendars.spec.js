const expect = require('chai').expect;
const rewire = require('rewire');
const sinon  = require('sinon');
const mockEventList = require('./mocks/eventList.json');
const Promise = require('bluebird');
const AdministerCalendars = rewire('../services/AdministerCalendars');

describe('Administer Calendar Test', function CalendarTestSuite() {
	const calendar = AdministerCalendars.__get__('calendar');
	const listSpy = sinon.spy(AdministerCalendars.__get__('listEvents'));
	let jwtRevert;

	beforeEach(function setUp(done) {
		const jwtMock = {
			createJWT: () => Promise.resolve('a secured client')
		};

		jwtRevert = AdministerCalendars.__set__('AdministerJWT', jwtMock);
		done();
	});

	afterEach(() => jwtRevert());

	it('should send an update to Google Calendar', done => {
		const updateEvent = AdministerCalendars.__get__('updateEvent');
		const updateSpy = sinon.spy(calendar.events, 'update');
		const fakeResourceBody = {
			summary: 'testing',
			foo: 'bar'
		};

		// Since it will fail as this isn't an actual event
		updateEvent({eventId: 'event1', calendarId: 'calendar1'}, fakeResourceBody)
			.catch(() => {
				const expectedParams = {
					eventId: 'event1',
					calendarId: 'calendar1',
					resource: fakeResourceBody,
					auth: 'a secured client'
				};

				expect(updateSpy.calledWith(expectedParams)).to.be.true;
				done();
			});
	});

	it('should return a sync token', done => {
		const mockFullSync = () => Promise.resolve(mockEventList);
		const revert = AdministerCalendars.__set__('getFullSync', mockFullSync);
		const getSyncToken = AdministerCalendars.__get__('getSyncToken');

		getSyncToken()
			.then(syncToken => {
				expect(syncToken).to.equal('CPiw4dWUu84CEPiw4dWUu84CGAU=');
				revert();
				done();
			});
	});

	// Save
	// it('should perform a full sync', function fullSyncTest(done) {
	//   var getFullSync = AdministerCalendars.__get__('getFullSync');

	//   getFullSync('brhim@apidevdemo.com')
	//     .then(function fullSyncResponse() {
	//       // @TODO: Add nextPageToken test and rewrite
	//       expect(listSpy.called).to.be.true;
	//       done();
	//     });

	//   var mock1 = {
	//     events: [1, 2],
	//     nextPageToken: 2
	//   };

	//   var mock2 = {
	//     events: [3, 4],
	//     syncToken: 'token'
	//   };

	//   // Override eventList to check integrity of callback
	//   var eventListMock = function list(params, cb) {
	//     if (params.nextPageToken) {
	//       return cb(undefined, mock2);
	//     }
	//     return cb(undefined, mock1);
	//   };

	//   var revert = AdministerCalendars.__set__('calendar.events.list', eventListMock);

	//   getFullSync('brhim@apidevdemo.com')
	//     .then(function fullSyncResponse(lastPageResponse) {
	//       expect(lastPageResponse.syncToken).to.equal('token');
	//       revert();
	//       done();
	//     });
	// });

	// it('should perform an incremental sync', function incrementSyncTest(done) {
	//   var getIncrementalSync = AdministerCalendars.__get__('getIncrementalSync');
	//   var mockCalendarInfo = {
	//     syncToken: '12345abcefg',
	//     calendarId: 'calendarId1'
	//   };

	//   getIncrementalSync(mockCalendarInfo)
	//     .catch(function incrementSyncResp() {
	//       var expectedParams = {
	//         auth: 'a secured client',
	//         calendarId: 'calendarId1',
	//         singleEvents: false,
	//         syncToken: '12345abcefg',
	//         showDeleted: true
	//       };

	//       expect(listSpy.calledWith(expectedParams)).to.be.true;
	// 	done();
	//     });
	// });
});
