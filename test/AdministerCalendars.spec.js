var expect = require('chai').expect;
var rewire = require('rewire');
var sinon  = require('sinon');
var mockEventList = require('./mocks/eventList.json');
var Promise = require('bluebird');
var AdministerCalendars = rewire('../services/AdministerCalendars');

describe('Administer Calendar Test', function CalendarTestSuite() {
  beforeEach(function setUp(done) {
    var jwtMock = {
      createJWT: function jwtFake() {
        return Promise.resolve('a secured client');
      }
    };

    AdministerCalendars.__set__('AdministerJWT', jwtMock);
    done();
  });

  it('should send an update to Google Calendar', function UserListParams(done) {
    var calendar = AdministerCalendars.__get__('calendar');
    var updateEvent = AdministerCalendars.__get__('updateEvent');
    var updateSpy = sinon.spy(calendar.events, 'update');
    var fakeResourceBody = {
      summary: 'testing',
      foo: 'bar'
    };

    // Since it will fail as this isn't an actual event
    updateEvent({ eventId: 'event1', calendarId: 'calendar1' }, fakeResourceBody)
      .catch(function updateError() {
        var expectedParams = {
          eventId: 'event1',
          calendarId: 'calendar1',
          resource: fakeResourceBody,
          auth: 'a secured client'
        };

        expect(updateSpy.calledWith(expectedParams)).to.be.true;
        done();
      });
  });

  it('should return a sync token', function syncTokenTest(done) {
    var mockFullSync = function sync() {
      return Promise.resolve(mockEventList);
    };
    AdministerCalendars.__set__('getFullSync', mockFullSync);

    var getSyncToken = AdministerCalendars.__get__('getSyncToken');
    getSyncToken().then(function syncTokenResponse(syncToken) {
      expect(syncToken).to.equal('CPiw4dWUu84CEPiw4dWUu84CGAU=');
      done();
    });
  });

  it('should perform an incremental sync', function incrementSyncTest(done) {
    var calendar = AdministerCalendars.__get__('calendar');
    var getIncrementalSync = AdministerCalendars.__get__('getIncrementalSync');
    var updateSpy = sinon.spy(calendar.events, 'list');

    var mockCalendarInfo = {
      syncToken: '12345abcefg',
      calendarId: 'calendarId1'
    };

    getIncrementalSync(mockCalendarInfo)
      .catch(function incrementSyncResp() {
        var expectedParams = {
          auth: 'a secured client',
          calendarId: 'calendarId1',
          singleEvents: false,
          syncToken: '12345abcefg',
          showDeleted: true
        };

        expect(updateSpy.calledWith(expectedParams)).to.be.true;
        done();
      });
  });
});
