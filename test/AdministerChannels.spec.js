var expect = require('chai').expect;
var sinon = require('sinon');
var eventsMock = require('./mocks/eventList.json');
var AdministerJWT = require('../services/AdministerJWT');
var bluebird = require('bluebird');
var google = require('googleapis');
var calendar = google.calendar('v3');

process.env.environment = 'testing';
var AdministerChannels = require('../services/AdministerChannels');

describe('Administer Channels Service', function() {
  it('should parse request headers', function(done) {
    var parsedHeaders = AdministerChannels.parseHeaders()
    expect(parsedHeaders).to.equal();
    done();
  });

  it('should set a renewal for channels', function(done) {
    var parsedHeaders = AdministerChannels.parseHeaders()
    expect(parsedHeaders).to.equal();
    done();
  });

  it('should build params based on type', function(done) {
    var channelInfo = {
      resourceType: 'event',
      calendarId: 'testUser'
    };
    var eventParams = AdministerChannels.buildParams(null, channelInfo);
    expect(eventParams).to.have.property('auth');
    expect(eventParams.calendarId).to.equal('testUser');
    expect(eventParams).to.have.property('resource');
    expect(eventParams.resource.id.indexOf('EVNT')).to.be.above(-1);

    var channelInfo = {
      resourceType: 'directory',
    };
    var dirParams = AdministerChannels.buildParams(null, channelInfo);
    expect(dirParams).to.have.property('auth');
    expect(dirParams).to.have.property('resource');
    expect(dirParams.resource.id.indexOf('DIR')).to.be.above(-1);
    done();
  });

  it('should save a channel', function(done) {
    var mongoose = require('mongoose');
    var ChannelEntry = mongoose.model('Channel', require('../data/schema/channel'));
    var saveSpy = sinon.spy(ChannelEntry, 'save');
    var channelInfo = {
      channelId: '123456',
      resourceId: '',
      syncToken: '',
      expiration: '',
      resourceType: 'event'
    };
    done();
  });

  it('should create a channel', function(done) {
    sinon.stub(AdministerJWT, 'createJWT', function () {
      return Promise.resolve('test');
    });
    var createEventChannel = sinon.spy(calendar.events, 'watch');

    var channel = {
      resourceType: 'event'
    };
    AdministerChannels.create(channel);
    console.log(createEventChannel.calledOnce);
  });

  it('should get the delta of expiration of channel', function(done) {
    var today = new Date();
    var addHours = 5;
    var addMs = addHours * 60000;
    var futureDate = new Date(today.getTime() + addMs);
    var mockChannel = {
      expiration: futureDate
    };
    var msDelta = AdministerChannels.getTimeoutMs(mockChannel);
    // Since the time difference will be adjusted until
    // the test is executed, it should equate to the hour
    // difference. This could be re-evaluated
    var hourDelta = Math.ceil(msDelta / 60000);
    expect(addHours).to.be.equal(hourDelta);

    var pastDate = new Date(today.getTime() - 60000);
    var expiredChannel = {
      expiration: pastDate
    };
    var msDelta = AdministerChannels.getTimeoutMs(expiredChannel);
    expect(msDelta).to.be.equal(0);
    done();
  });


});
