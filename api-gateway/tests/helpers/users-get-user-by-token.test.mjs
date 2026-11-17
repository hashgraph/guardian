import assert from 'node:assert/strict';
import { AuthEvents } from '@guardian/interfaces';
import { Users, USER_BY_TOKEN_TIMEOUT_MS } from '../../dist/helpers/users.js';

describe('Users.getUserByToken', () => {
    it('asks the auth service with a bounded wait so a lost reply cannot hang the auth guard', async () => {
        const users = new Users();
        let call;
        users.sendMessageWithTimeout = async (subject, timeout, data) => {
            call = { subject, timeout, data };
            return { username: 'alice' };
        };

        const user = await users.getUserByToken('jwt');

        assert.deepEqual(user, { username: 'alice' });
        assert.deepEqual(call, {
            subject: AuthEvents.GET_USER_BY_TOKEN,
            timeout: USER_BY_TOKEN_TIMEOUT_MS,
            data: { token: 'jwt' },
        });
    });

    it('rejects when the auth service does not answer in time', async () => {
        const users = new Users();
        users.sendMessageWithTimeout = async () => {
            throw Object.assign(new Error('Timeout exceed'), { code: 'REQUEST_TIMEOUT' });
        };

        await assert.rejects(users.getUserByToken('jwt'), (error) => error.code === 'REQUEST_TIMEOUT');
    });
});
