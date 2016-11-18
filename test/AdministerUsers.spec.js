var expect = require('chai').expect;
var rewire = require('rewire');
var AdministerUsers = rewire('../services/AdministerUsers');
// var userResponse = require('./mocks/userList.json');
// var google = require('googleapis');
// var directory = google.admin('directory_v1');
// var googleApiUrl = require('./config').googleApiUrl;
var sinon = require('sinon');

describe('Administer Users Service', function UserServiceTest() {
//  @TODO: comeback to this test, sinon is not stubbing the list method
  it('should return a users lists', function(done) {
    var directory = AdministerUsers.__get__('directory');
    var list = sinon.stub(directory.users, 'list');
    AdministerUsers.list('secureToken', null);
    expect(list.calledOnce).to.be.true;
    done();
  });

  it('should throw an error when there is no token', function userListErrorTest(done) {
    AdministerUsers.list(null, null, function listResponse(err) {
      expect(err).to.be.an('error');
      done();
    });
  });
});
