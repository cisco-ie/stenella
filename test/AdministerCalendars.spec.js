var expect = require('chai').expect;
var rewire = require('rewire');
var sinon  = require('sinon');
// var mockEventList = require('./mocks/eventList.json');
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
});
