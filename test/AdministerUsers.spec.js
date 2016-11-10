var expect = require('chai').expect;
var nock = require('nock');
var AdministerUsers = require('../services/AdministerUsers');
var userResponse = require('./mocks/userList.json');
var google = require('googleapis');
var directory = google.admin('directory_v1');
var googleApiUrl = require('./config').googleApiUrl;
var sinon = require('sinon');

describe('Administer Users Service', function() {
  // @TODO: comeback to this test, sinon is not stubbing the list method
  // it('should return a users lists', function(done) {
  //   var list = sinon.stub(directory.users, 'list');

  //   AdministerUsers.list('secureToken', null);
  //     done();
  // });

  it('should throw an error when there is no token', function(done) {
    AdministerUsers.list(null, null, function(err) {
      expect(err).to.be.an('error');
      done();
    });
  });

});
