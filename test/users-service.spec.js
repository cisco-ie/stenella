const expect = require('chai').expect;
const rewire = require('rewire');
const Promise = require('bluebird');
const sinon = require('sinon');
const userListMock = require('./mocks/userList.json');

const UserService = rewire('../services/user-service');

describe('User Service', () => {
	let revert;

	beforeEach(() => {
		const mockWithToken = Object.create(userListMock);
		mockWithToken.nextPageToken = 1;
		const secondPageMock = {
			nextPageToken: 2,
			users: [
				{
					name: 'Simon',
					from: 'Page 2'
				}
			]
		};

		const thirdPageMock = {
			users: [
				{
					name: 'Henry',
					from: 'Page 3'
				}
			]
		};

		const listStub = (params, cb) => {
			// To prevent infinite loop, call the stub without a pageToken property,
			// and check responding with a 2nd pagetoken will indicate the third call
			if (!params.pageToken) {
				return cb(null, mockWithToken);
			}

			if (params.pageToken === 1) {
				return cb(null, secondPageMock);
			}

			if (params.pageToken === 2) {
				return cb(null, thirdPageMock);
			}
		};

		// eslint-disable-next-line no-use-extend-native/no-use-extend-native
		revert = UserService.__set__('getDirectory', Promise.promisify(listStub));
	});

	afterEach(() => revert());

	it('should build user list params', done => {
		const buildParams = UserService.buildParams;

		const defaultRequiredParams = {
			auth: {},
			maxResults: 500,
			domain: 'companydomain.com',
			orderBy: 'email'
		};

		expect(buildParams({})).to.deep.equal(defaultRequiredParams);

		const expectedOverride = defaultRequiredParams;
		expectedOverride.maxResults = 1;
		expect(buildParams({}, {maxResults: 1})).to.deep.equal(expectedOverride);
		done();
	});

	it('should return a combined response if paginated', done => {
		const requestUserList = UserService.requestUserList;
		requestUserList({})
			.then(resp => {
				// This would be the default mock + Henry + Simon
				expect(resp.users.length).to.equal(10);
				expect(resp.users[9].name).to.equal('Henry');
				done();
			});
	});

	it('should get a token and get users', done => {
		const listUsers = UserService.list;
		const JWTStub = sinon.stub().returns(Promise.resolve({auth: 'secure client'}));
		const jwtRevert = UserService.__set__('createJWT', JWTStub);

		listUsers({})
			.then(resp => {
				// eslint-disable-next-line no-unused-expressions
				expect(JWTStub.calledOnce).to.be.true;
				// eslint-disable-next-line no-unused-expressions
				expect(resp.users.length).to.equal(10);
				jwtRevert();
				done();
			});
	});
});
