var expect = require('chai').expect;
var sinon = require('sinon');
var eventsMock = require('./mocks/eventList.json');
var rewire = require('rewire');
var eventController = rewire('../controllers/eventController');

describe('Event Controller', function EventControllerTest() {
  it('should determine WebEx events', function checkWebExEventTest(done) {
    var isWebEx = eventController.__get__('isWebEx');
    var webExEvent = isWebEx(eventsMock.items[0]);
    expect(webExEvent).to.equal(true);

    var notWebExEvent = isWebEx(eventsMock.items[1]);
    expect(notWebExEvent).to.equal(false);

    done();
  });

  it('should check if new event needs an update', function checkEventUpdateTest(done) {
    var requiresUpdate = eventController.__get__('requiresUpdate');
    var webExEvent = requiresUpdate(eventsMock.items[0]);
    expect(webExEvent).to.equal(true);

    webExEvent = requiresUpdate(eventsMock.items[1]);
    expect(webExEvent).to.equal(false);

    done();
  });

  it('should build a description with the PMR url', function buildPMRTest(done) {
    var createPMRUrl = eventController.__get__('createPMRUrl');
    var createSignature = eventController.__get__('createSignature');
    var buildDescription = eventController.__get__('buildDescription');

    var url = createPMRUrl(eventsMock.items[0]);
    expect(url).to.equal('http://cisco.webex.com/meet/squirtle');

    var signature = createSignature(url);
    expect(signature.indexOf('http://cisco.webex.com/meet/squirtle')).to.be.above(-1);

    var description = buildDescription(eventsMock.items[0]);
    expect(description.indexOf(signature)).to.be.above(-1);

    done();
  });

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

  it('should prepend WebEx to the summary', function prependWebexTest(done) {
    var buildSummary = eventController.__get__('buildSummary');

    var summaryInput1 = 'Test Title';
    var summary1 = buildSummary(summaryInput1);
    expect(summary1).to.equal('WebEx: Test Title');

    var summaryInput2 = 'WebEx: Test Title 2';
    var summary2 = buildSummary(summaryInput2);
    // Should not prepend WebEx
    expect(summary2).to.equal('WebEx: Test Title 2');
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

  // it('should persist to the db with a new token from the response', function persistTokenTest(done) {
  //   var mongoose = require('mongoose');
  //   var ChannelEntry = mongoose.model('Channel', require('../data/schema/channel'));

  //   var updateSpy = sinon.spy(ChannelEntry, 'update');
  //   eventController.persistNewSyncToken(eventsMock);
  //   var query = {
  //     calendarId: eventsMock.summary
  //   };
  //   var update = {
  //     syncToken: eventsMock.nextSyncToken
  //   };
  //   expect(updateSpy.calledWithExactly(query, update)).to.equal(true);

  //   done();
  // });
});
