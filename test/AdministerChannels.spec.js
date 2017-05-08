'use strict';

var expect             = require('chai').expect;
// var sinon              = require('sinon');
// var AdministerJWT      = require('../services/AdministerJWT');
// var google             = require('googleapis');
// var calendar           = google.calendar('v3');
var rewire             = require('rewire');
var AdministerChannels = rewire('../services/AdministerChannels');
var connectToDb        = require('../data/db/connection');
connectToDb('test');

describe('Administer Channels Service', function ChannelServiceTest() {
  it('should parse request headers', function parseHeadersTest(done) {
    var sampleRequest = {
      headers: {
        'x-goog-channel-id': 'EVNT-7fadc50c-347c-4941-aca6-0abfa961be97',
        'x-goog-channel-expiration': 'Thu, 17 Nov 2016 01:05:06 GMT',
        'x-goog-resource-state': 'sync',
        'x-goog-message-number': '1',
        'x-goog-resource-id': 'wquZbeosVUDpi0X8l_Jaz_BMTdA',
        'x-goog-resource-uri': 'https://www.googleapis.com/calendar/v3/calendars/rrawat@apidevdemo.com/events?maxResults=250&alt=json',
        'content-length': '0',
        'user-agent': 'APIs-Google; (+https://developers.google.com/webmasters/APIs-Google.html)',
        'accept-encoding': 'gzip,deflate,br',
        'x-forwarded-proto': 'https',
        'x-forwarded-for': '66.102.6.215'
      }
    };
    var actualParsedHeaders = AdministerChannels.parseHeaders(sampleRequest);
    var parsedHeaders = {
      channelId: 'EVNT-7fadc50c-347c-4941-aca6-0abfa961be97',
      expiration: 'Thu, 17 Nov 2016 01:05:06 GMT',
      messageNumber: '1',
      resourceId: 'wquZbeosVUDpi0X8l_Jaz_BMTdA',
      resourceState: 'sync',
      resourceUri: null
    };
    expect(actualParsedHeaders).to.deep.equal(parsedHeaders);
    done();
  });

  it('should build params based on type', function buildParamsTest(done) {
    var buildParams = AdministerChannels.__get__('buildParams');
    var channelInfo = {
      resourceType: 'event',
      calendarId: 'testUser'
    };
    var eventParams = buildParams(null, channelInfo);
    expect(eventParams).to.have.property('auth');
    expect(eventParams.calendarId).to.equal('testUser');
    expect(eventParams).to.have.property('resource');
    expect(eventParams.resource.id.indexOf('EVNT')).to.be.above(-1);

    channelInfo = {
      resourceType: 'directory'
    };
    var dirParams = buildParams(null, channelInfo);
    expect(dirParams).to.have.property('auth');
    expect(dirParams).to.have.property('resource');
    expect(dirParams.resource.id.indexOf('DIR')).to.be.above(-1);

    done();
  });

  it('should save a channel', function saveChannelTest(done) {
    var mongoose = require('mongoose');
    var ChannelEntry = mongoose.model('Channel', require('../data/schema/channel'));
    var saveChannel = AdministerChannels.__get__('saveChannel');

    var channelInfo = {
      channelId: 'test-12345',
      resourceId: '',
      syncToken: '',
      expiration: '',
      resourceType: 'event'
    };

    saveChannel(channelInfo);

    ChannelEntry.findOne({ channelId: 'test-12345'}, function findCb(err, document) {
      expect(document).to.exist;
      ChannelEntry.remove({});
      done();
    });
  });

  // it('should create a channel', function createChannelTest(done) {
  //   // sinon.stub(AdministerJWT, 'createJWT', function jwtStub() {
  //   //   return Promise.resolve('test');
  //   // });
  //   // var createEventChannel = sinon.spy(calendar.events, 'watch');

  //   // var channel = {
  //   //   resourceType: 'event'
  //   // };
  //   // AdministerChannels.create(channel);
  //   // expect(createEventChannel.calledOnce).to.be(true);
  //   // done();
  // });

  it('should get the delta of expiration of channel', function calcExpireDeltaTest(done) {
    var getTimeoutMs = AdministerChannels.__get__('getTimeoutMs');
    var today = new Date();
    var addHours = 5;
    var addMs = addHours * 60000;
    var futureDate = new Date(today.getTime() + addMs);
    var mockChannel = {
      expiration: futureDate
    };
    var msDelta = getTimeoutMs(mockChannel);
    // Since the time difference will be adjusted until
    // the test is executed, it should equate to the hour
    // difference. This could be re-evaluated
    var hourDelta = Math.ceil(msDelta / 60000);
    expect(addHours).to.be.equal(hourDelta);

    var pastDate = new Date(today.getTime() - 60000);
    var expiredChannel = {
      expiration: pastDate
    };
    msDelta = getTimeoutMs(expiredChannel);
    expect(msDelta).to.be.equal(0);
    done();
  });
});
