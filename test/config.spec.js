var expect = require('chai').expect;
var rewire = require('rewire');
var config = rewire('../configs/config');

describe('Configuration Test Suite', function UserServiceTest() {
  it('Should strip the url of trailing backslash', function normalizeUrlTest(done) {
    var normalizeUrl = config.__get__('normalizeUrl');
    var testUrl = 'http://google.com/';

    expect(normalizeUrl(testUrl)).to.equal('http://google.com');
    expect(function execute() {
      normalizeUrl(null);
    }).to.throw;
    done();
  });

  it('Should throw errors for undefined values in the config', function configTest() {
    var throwUndefined = config.__get__('throwUndefined');

    expect(function execute() {
      throwUndefined(undefined, 'test');
    }).to.throw;

    expect(function execute() {
      throwUndefined('Hello World', 'test');
    }).to.not.throw;
  });
});
