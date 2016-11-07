var expect = require('chai').expect;
var sinon = require('sinon');
var eventsMock = require('./mocks/eventList.json');

process.env.environment = 'testing';
var eventController = require('../controllers/eventController');

describe('Event Controller', function() {
  // it('Parses events and calls correct action', function(done) {
  //   sinon.spy(eventController, 'eventFactory');
  //   sinon.stub(eventController, 'isWebEx');
  //   eventController.parseEvents(mockResp);
  //   expect(eventController.eventFactory.calledOnce).to.equal(true);
  //   done();
  // });
  it('should determine WebEx events', function(done) {
    var webExEvent = eventController.isWebEx(eventsMock.items[0]);
    expect(webExEvent).to.equal(true);

    var notWebExEvent = eventController.isWebEx(eventsMock.items[1]);
    expect(notWebExEvent).to.equal(false);

    done();
  });

  it('should check if new event needs an update', function(done) {
    var webExEvent = eventController.requiresUpdate(eventsMock.items[0]);
    expect(webExEvent).to.equal(true);

    var webExEvent = eventController.requiresUpdate(eventsMock.items[1]);
    expect(webExEvent).to.equal(false);

    done();
  });

  it('should build a description with the PMR url', function (done) {
    var url = eventController.createPMRUrl(eventsMock.items[0]);
    expect(url).to.equal('http://cisco.webex.com/meet/squirtle');

    var signature = eventController.createSignature(url);
    expect(signature.indexOf('http://cisco.webex.com/meet/squirtle')).to.be.above(-1);

    var description = eventController.buildDescription(eventsMock.items[0]);
    expect(description.indexOf(signature)).to.be.above(-1);

    done();
  });

  it('should get the user from the email', function (done) {
    var testEmail1 = 'squirtle@live.com';
    var actualEmail1 = eventController.parseUserIdFromEmail(testEmail1);
    expect(actualEmail1).to.equal('squirtle');

    var testEmail2 = 'charmander@live.com';
    var actualEmail2 = eventController.parseUserIdFromEmail(testEmail2);
    expect(actualEmail2).to.equal('charmander');

    done();
  });

  it('should persist to the db with a new token from the response', function (done) {
    var mongoose = require('mongoose');
    var channel = mongoose.model('Channel', channelSchema);
    var channelSchema = require('../data/schema/channel');
    var ChannelEntry = mongoose.model('Channel', require('../data/schema/channel'));

    var updateSpy = sinon.spy(ChannelEntry, 'update');
    eventController.persistNewSyncToken(eventsMock);
    var query = {
      calendarId: eventsMock.summary
    };
    var update = {
      syncToken: eventsMock.nextSyncToken
    };
    expect(updateSpy.calledWithExactly(query, update)).to.equal(true);

    done();
  });
});
