const expect = require('chai').expect;
const rewire = require('rewire');
const sinon = require('sinon');
const connectToDb = require('../data/db/connection');

const ChannelService = rewire('../services/channel-service');

describe('Channels Service', () => {
	it('should parse request headers', done => {
		const sampleRequest = {
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
		const actualParsedHeaders = ChannelService.parseHeaders(sampleRequest);
		const parsedHeaders = {
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

	it('should build params based on type', done => {
		const buildParams = ChannelService.__get__('buildParams');
		let channelInfo = {
			resourceType: 'event',
			calendarId: 'testUser'
		};
		const eventParams = buildParams(null, channelInfo);
		expect(eventParams).to.have.property('auth');
		expect(eventParams.calendarId).to.equal('testUser');
		expect(eventParams).to.have.property('resource');
		expect(eventParams.resource.id.indexOf('EVNT')).to.be.above(-1);

		channelInfo = {
			resourceType: 'directory'
		};
		const dirParams = buildParams(null, channelInfo);
		expect(dirParams).to.have.property('auth');
		expect(dirParams).to.have.property('resource');
		expect(dirParams.resource.id.indexOf('DIR')).to.be.above(-1);

		done();
	});

	it('should save a channel', done => {
		const mongoose = require('mongoose');
		connectToDb('test');
		const ChannelEntry = mongoose.model('Channel', require('../data/schema/channel'));
		const saveChannel = ChannelService.__get__('saveChannel');

		const channelInfo = {
			channelId: 'test-12345',
			resourceId: '',
			syncToken: '',
			expiration: '',
			resourceType: 'event'
		};

		saveChannel(channelInfo)
			.then(() => {
				ChannelEntry.findOne({channelId: 'test-12345'}, (err, document) => {
					if (err) {
						console.log(err);
					}
					// eslint-disable-next-line no-unused-expressions
					expect(document).to.exist;
					ChannelEntry.remove({});
					done();
				});
			})
			.catch(console.log);
	});

	it('should create an event channel', done => {
		const jwtStub = sinon.stub().returns(Promise.resolve('test'));
		const jwtRevert = ChannelService.__set__('createJWT', jwtStub);
		const watchStub = sinon.stub().callThrough();
		const eventsWatchRevert = ChannelService.__set__('watchEvents', watchStub);
		const channel = {
			resourceType: 'event'
		};

		ChannelService.create(channel).catch(() => {
			// eslint-disable-next-line no-unused-expressions
			expect(watchStub.calledOnce).to.be.true;
			jwtRevert();
			eventsWatchRevert();
			done();
		});
	});

	it('should create a directory channel', done => {
		const jwtStub = sinon.stub().returns(Promise.resolve('test'));
		const jwtRevert = ChannelService.__set__('createJWT', jwtStub);
		const watchStub = sinon.stub().callThrough();
		const usersWatchRevert = ChannelService.__set__('watchUsers', watchStub);
		const channel = {
			resourceType: 'directory'
		};

		ChannelService.create(channel).catch(() => {
			// eslint-disable-next-line no-unused-expressions
			expect(watchStub.calledOnce).to.be.true;
			jwtRevert();
			usersWatchRevert();
			done();
		});
	});

	it('should get the delta of expiration of channel', done => {
		const getTimeoutMs = ChannelService.__get__('getTimeoutMs');
		const today = new Date();
		const addHours = 5;
		const addMs = addHours * 60000;
		const futureDate = new Date(today.getTime() + addMs);
		const mockChannel = {
			expiration: futureDate
		};
		let msDelta = getTimeoutMs(mockChannel);
		// Since the time difference will be adjusted until
		// the test is executed, it should equate to the hour
		// difference. This could be re-evaluated
		const hourDelta = Math.ceil(msDelta / 60000);
		expect(addHours).to.be.equal(hourDelta);

		const pastDate = new Date(today.getTime() - 60000);
		const expiredChannel = {
			expiration: pastDate
		};
		msDelta = getTimeoutMs(expiredChannel);
		expect(msDelta).to.be.equal(0);
		done();
	});
});
