/**
 * Variable Declarations
 */
var expect = require('chai').expect;
var nock = require('nock');
var AdministerUsers = require('../services/AdministerUsers');
var userResponse = require('./mocks/userList.json');
var googleApiUrl = require('./config').googleApiUrl;

describe('Administer Users Service', function() {
  beforeEach(function() {
    nock(googleApiUrl)
      .get('/admin/directory/v1/users')
      .query({
        domain: 'apidevdemo.com',
        maxResults: '500',
        orderBy: 'email',
        key: 'secureToken'
      })
      .reply(200, userResponse);
  });

  it('should return a users lists', function(done) {
    AdministerUsers.list('secureToken', null, function(err, response) {
      expect(response).to.have.any.keys('users');
      done();
    });
  });

  it('should throw an error when there is no token', function(done) {
    AdministerUsers.list(null, null, function(err) {
      expect(err).to.be.an('error');
      done();
    });
  });
});
