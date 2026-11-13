import assert from 'node:assert/strict';
import sinon from 'sinon';
import { AuthEvents } from '@guardian/interfaces';
import { Users, USERS_REQUEST_TIMEOUT_MS, USERS_HEDERA_REQUEST_TIMEOUT_MS } from '../../../dist/helpers/users.js';

// The services ask the auth service through this helper, inside tasks and handlers. A reply that never
// comes must end the call, or the caller waits forever after its earlier writes (an onboarding task
// that has written the DID and then never gets the user update answered).
describe('Users (common) requests to the auth service', () => {
    let clock;
    let users;

    beforeEach(() => {
        clock = sinon.useFakeTimers();
        users = new Users();
        sinon.stub(users, 'sendMessage').returns(new Promise(() => undefined));
    });

    afterEach(() => {
        sinon.restore();
    });

    const expectTimeoutAfter = async (pending, bound) => {
        let settled = false;
        const outcome = assert.rejects(pending, (error) => error.code === 'REQUEST_TIMEOUT').then(() => { settled = true; });
        await clock.tickAsync(bound - 1);
        assert.equal(settled, false, 'it must not give up before its bound');
        await clock.tickAsync(1);
        await outcome;
    };

    it('ends the user update of an onboarding task when the auth service does not answer', async () => {
        await expectTimeoutAfter(users.updateCurrentUser('alice', { did: 'did:x' }, null), USERS_REQUEST_TIMEOUT_MS);
        assert.equal(users.sendMessage.firstCall.args[0], AuthEvents.UPDATE_USER);
    });

    it('ends a user lookup', async () => {
        await expectTimeoutAfter(users.getUserById('did:x', null), USERS_REQUEST_TIMEOUT_MS);
    });

    it('gives the relayer account creation, which runs on the Hedera network, a longer bound', async () => {
        await expectTimeoutAfter(users.createRelayerAccount({ did: 'did:x' }, { account: '0.0.1' }, null), USERS_HEDERA_REQUEST_TIMEOUT_MS);
    });

    it('answers with the reply when it arrives in time', async () => {
        users.sendMessage.resolves({ username: 'alice' });

        assert.deepEqual(await users.getUserById('did:x', null), { username: 'alice' });
        assert.equal(clock.countTimers(), 0);
    });
});
