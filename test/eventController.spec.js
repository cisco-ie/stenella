var expect = require('chai').expect;
var sinon = require('sinon');
var eventsMock = require('./mocks/eventList.json');
var rewire = require('rewire');
var eventController = rewire('../controllers/eventController');

describe('Event Controller', function EventControllerTest() {
  it('should get the user from the email', function parseEmailTest(done) {
    var parseUserIdFromEmail = eventController.__get__('parseUserIdFromEmail');

    var testEmail1 = 'squirtle@live.com';
    var actualEmail1 = parseUserIdFromEmail(testEmail1);
    expect(actualEmail1).to.equal('squirtle');

    var testEmail2 = 'charmander@live.com';
    var actualEmail2 = parseUserIdFromEmail(testEmail2);
    expect(actualEmail2).to.equal('charmander');

    done();
  });

  it('should update the event', function updateEventTest(done) {
    var AdministerCalendars = eventController.__get__('AdministerCalendars');
    var parseEvents = eventController.__get__('parseEvents');
    var buildSummary = eventController.__get__('buildSummary');
    var buildDescription = eventController.__get__('buildDescription');
    var updateSpy = sinon.spy(AdministerCalendars, 'updateEvent');
    parseEvents(eventsMock);

    var event1 = eventsMock.items[0];

    // Test against the event update payload,
    // because the event update is returning an
    // invoked function with the final param payload
    var resourceBody1 = {
      summary: buildSummary(event1.summary),
      location: event1.location,
      end: event1.end,
      start: event1.start,
      description: buildDescription(event1)
    };

    var eventParams1 = {
      calendarId: eventsMock.summary,
      eventId: event1.id,
      resource: resourceBody1
    };

    var event2 = eventsMock.items[2];
    var resourceBody2 = {
      summary: buildSummary(event2.summary),
      location: event2.location,
      end: event2.end,
      start: event2.start,
      description: buildDescription(event2)
    };

    var eventParams2 = {
      calendarId: eventsMock.summary,
      eventId: event2.id,
      resource: resourceBody2
    };

    expect(updateSpy.called).to.be.true;
    sinon.assert.calledWithMatch(updateSpy, sinon.match(eventParams1));
    sinon.assert.calledWithMatch(updateSpy, sinon.match(eventParams2));
    done();
  });
});
