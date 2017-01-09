var expect = require('chai').expect;
var rewire = require('rewire');
var Promise = require('bluebird');
var AdministerUsers = rewire('../services/AdministerUsers');
var userListMock = require('./mocks/userList.json');

describe('Administer Users Service', function UserServiceTest() {
  beforeEach(function setUp(done) {
    var jwtMock = {
      createJWT: function jwtFake() {
        return Promise.resolve('a secured client');
      }
    };

    AdministerUsers.__set__('AdministerJWT', jwtMock);
    done();
  });
  // @TODO: Add promise based test afterwards
  it('should build user list params', function UserListParams(done) {
    var buildParams = AdministerUsers.__get__('buildParams');

    var defaultRequiredParams = {
      auth: {},
      maxResults: 500,
      domain: 'apidevdemo.com',
      orderBy: 'email'
    };

    expect(buildParams({})).to.deep.equal(defaultRequiredParams);

    var expectedOverride = defaultRequiredParams;
    expectedOverride.maxResults = 1;

    expect(buildParams({}, { maxResults: 1 })).to.deep.equal(expectedOverride);
    done();
  });

  it('should get users with desired params and authentication', function GetUserSetUp(done) {
    var getUsers = AdministerUsers.__get__('getUsers');

    // Can't invoke a spy on a private function,
    // but want to check integrity of the params
    var requestUserStub = function paramCheck(params) {
      return Promise.resolve(params);
    };
    var revertRequestStub = AdministerUsers.__set__('requestUserList', requestUserStub);
    getUsers({ maxResults: 1 })
      .then(function(requestParams) {
        var expectedParams = {
          auth: 'a secured client',
          maxResults: 1,
          orderBy: 'email',
          domain: 'apidevdemo.com'
        };
        expect(requestParams).to.deep.equal(expectedParams);
        revertRequestStub();
        done();
      });
  });

  it('should get users', function GetUserTest(done) {
    var requestUserList = AdministerUsers.__get__('requestUserList');
    var listStub = function list(params, cb) {
      return cb(undefined, userListMock);
    };
    var revertUserListStub = AdministerUsers.__set__('directory.users.list', listStub);

    requestUserList()
      .then(function(response) {
        expect(response).to.deep.equal(userListMock);
        revertUserListStub();
        done();
      });
  });

  it('should return a combined response if paginated', function PaginateTest(done) {
    var requestUserList = AdministerUsers.__get__('requestUserList');
    var mockWithToken = Object.create(userListMock);
    mockWithToken.nextPageToken = 'token1';

    var listStub = function list(params, cb) {
      // To prevent infinite loop, call the stub without a pageToken property,
      // and check responding with a 2nd pagetoken will indicate the third call
      if (params.pageToken) {
        var secondPageMock = {
          nextPageToken: 2,
          users: [
            {
              name: 'Simon',
              from: 'Page 2'
            }
          ]
        };

        var thirdPageMock = {
          users: [
            {
              name: 'Henry',
              from: 'Page 3'
            }
          ]
        };

        if (params.pageToken === 2) {
          return cb(undefined, thirdPageMock);
        }
        return cb(undefined, secondPageMock);
      }
      return cb(undefined, mockWithToken);
    };

    AdministerUsers.__set__('directory.users.list', listStub);

    requestUserList({ foo: 'bar' })
      .then(function(response) {
        expect(response.users).to.contain({ name: 'Simon', from: 'Page 2' });
        expect(response.users).to.contain({ name: 'Henry', from: 'Page 3' });
        var expectedUserAmount = mockWithToken.users.length + 2;
        expect(response.users.length).to.equal(expectedUserAmount);
        done();
      });
  });
});
