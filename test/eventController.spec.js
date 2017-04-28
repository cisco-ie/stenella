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
});
