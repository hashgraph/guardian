import assert from 'node:assert/strict';
import sinon from 'sinon';
import { AuthEvents } from '@guardian/interfaces';
import { Users, USERS_REQUEST_TIMEOUT_MS } from '../../dist/helpers/users.js';

// Every lookup of the auth service behind a guard or a handler must end: a reply that never comes
// would hold the HTTP request open forever (and the frontend's shared token refresh with it).
describe('Users requests to the auth service', () => {
    let clock;
    let users;

    beforeEach(() => {
        clock = sinon.useFakeTimers();
        users = new Users();
        // the reply is lost: the request is sent and nothing ever answers
        sinon.stub(users, 'sendMessage').returns(new Promise(() => undefined));
    });

    afterEach(() => {
        sinon.restore();
    });

    const expectTimeout = async (pending) => {
        const outcome = assert.rejects(pending, (error) => error.code === 'REQUEST_TIMEOUT');
        await clock.tickAsync(USERS_REQUEST_TIMEOUT_MS);
        await outcome;
    };

    it('ends the access-token refresh when the auth service does not answer', async () => {
        await expectTimeout(users.generateNewAccessToken('refresh-token'));
        assert.equal(users.sendMessage.firstCall.args[0], AuthEvents.GENERATE_NEW_ACCESS_TOKEN);
    });

    it('ends the current-user lookup of a handler', async () => {
        await expectTimeout(users.getUser('alice', null));
    });

    it('ends the permission check behind a guard', async () => {
        await expectTimeout(users.permission({ user: { username: 'alice' } }, 'USER'));
    });

    it('ends the login', async () => {
        await expectTimeout(users.generateNewToken('alice', 'secret'));
    });

    it('keeps the token lookup within the same bound', async () => {
        await expectTimeout(users.getUserByToken('jwt'));
    });

    it('answers with the reply when it arrives in time', async () => {
        users.sendMessage.resolves({ accessToken: 'new' });

        assert.deepEqual(await users.generateNewAccessToken('refresh-token'), { accessToken: 'new' });
        assert.equal(clock.countTimers(), 0);
    });
});
