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
