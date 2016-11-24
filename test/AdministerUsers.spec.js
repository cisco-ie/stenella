var expect = require('chai').expect;
var rewire = require('rewire');
var AdministerUsers = rewire('../services/AdministerUsers');

describe('Administer Users Service', function UserServiceTest() {
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
});
