const expect = require('chai').expect;
const google = require('googleapis');
const directory = google.admin('directory_v1');
const rewire = require('rewire');
const Promise = require('bluebird');
const sinon = require('sinon');

const AdministerUsers = rewire('../services/AdministerUsers');
const userListMock = require('./mocks/userList.json');
const scope     = require('../constants/GoogleScopes');

describe('Administer User Service', () => {
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

		const listStub = function list(params, cb) {
			// To prevent infinite loop, call the stub without a pageToken property,
			// and check responding with a 2nd pagetoken will indicate the third call
			if (!params.pageToken)
				return cb(null, mockWithToken);

			if (params.pageToken === 1)
				return cb(null, secondPageMock);

			if (params.pageToken === 2)
				return cb(null, thirdPageMock);
		}

		revert = AdministerUsers.__set__('getDirectory', Promise.promisify(listStub));
	});

	afterEach(() => revert());

	it('should build user list params', done => {
		const buildParams = AdministerUsers.buildParams;

		const defaultRequiredParams = {
			auth: {},
			maxResults: 500,
			domain: 'companydomain.com',
			orderBy: 'email'
		};

		expect(buildParams({})).to.deep.equal(defaultRequiredParams);

		const expectedOverride = defaultRequiredParams;
		expectedOverride.maxResults = 1;

		expect(buildParams({}, { maxResults: 1 })).to.deep.equal(expectedOverride);
		done();
	});


	it('should return a combined response if paginated', function PaginateTest(done) {
		const requestUserList = AdministerUsers.requestUserList;
		requestUserList({})
			.then((resp) => {
				// This would be the default mock + Henry + Simon
				expect(resp.users.length).to.equal(10);
				expect(resp.users[9].name).to.equal('Henry');
				done();
			});
	});

	it('should get a token and get users', done => {
		const listUsers = AdministerUsers.list;
		const JWTStub = sinon.stub().returns(Promise.resolve({ auth: 'secure client' }));
		const jwtRevert = AdministerUsers.__set__('createJWT', JWTStub);
		listUsers({})
			  .then(resp => {
				  expect(JWTStub.calledOnce).to.be.true;
				  expect(resp.users.length).to.equal(10);
				  jwtRevert();

				  done();
			  });
	});
});
