import assert from 'node:assert/strict';
import { loadService, capturedHandlers } from './_handler-harness.mjs';

/*
 * A join request creates a remote user on the Main instance without a username or a
 * password. Such a user must never be able to sign in, refresh a session, change a
 * password, or be matched by a lookup with an empty username.
 */
const loginLess = {
    id: 'remote-1',
    did: 'did:hedera:testnet:remote_0.0.5',
    hederaAccountId: '0.0.100',
    parent: 'did:sr',
    role: 'USER',
    location: 'REMOTE',
    permissionsGroup: [],
    permissions: [],
    refreshToken: ['r-1'],
};

const state = { user: loginLess, saved: [], filters: [] };

class FakeDatabaseServer {
    async findOne(entity, filter) {
        // like a lenient query, an empty username filter still matches the user
        state.filters.push(filter);
        return state.user;
    }
    async find() { return []; }
    async findAndCount() { return [[], 0]; }
    async count() { return 0; }
    create(entity, data) { return { ...data }; }
    async save(entity, data) { state.saved.push(data); return { id: 'new', ...data }; }
    async update(entity, _, data) { return data; }
}

const tokens = {
    access: { username: undefined, did: loginLess.did, role: 'USER', expireAt: Date.now() + 60000 },
    refresh: { id: 'r-1', name: undefined, expireAt: Date.now() + 60000 },
};
const fakeTokenService = {
    generateAccessToken() { return 'access.jwt'; },
    generateRefreshToken() { return { id: 'r-2', token: 'refresh.jwt' }; },
    async verifyAccessToken() { return tokens.access; },
    async verifyRefreshToken() { return tokens.refresh; },
};

let handlers;
let UserUtils;

async function call(event, msg) {
    const handler = handlers.get(`Enum.${event}`);
    assert.ok(handler, `handler ${event} is registered`);
    return await handler(msg);
}

function isUnauthorized(result) {
    return result?.type === 'error' || (result?.type === 'response' && !result.body?.accessToken && !result.body?.refreshToken && !result.body?.did);
}

describe('@unit auth-service – remote users without a login', function () {
    this.timeout(60000);

    before(async () => {
        capturedHandlers.length = 0;
        const overrides = { '@guardian/common': { DatabaseServer: FakeDatabaseServer } };
        const utils = await loadService('../dist/utils/index.js', overrides);
        UserUtils = utils.UserUtils;
        utils.UserAccessTokenService.New = async () => fakeTokenService;
        const { AccountService } = await loadService('../dist/api/account-service.js', overrides, {
            '#utils': utils,
        });
        new AccountService().registerListeners({ async error() {}, async info() {}, async warn() {} });
        handlers = new Map(capturedHandlers.map(({ event, cb }) => [event, cb]));
    });

    beforeEach(() => {
        state.user = { ...loginLess };
        state.saved = [];
        state.filters = [];
    });

    it('recognises users that can sign in', () => {
        assert.equal(UserUtils.hasPasswordLogin(loginLess), false);
        assert.equal(UserUtils.canHoldSession(loginLess), false);
        assert.equal(UserUtils.hasPasswordLogin({ ...loginLess, username: 'alice' }), false, 'no password');
        assert.equal(UserUtils.hasPasswordLogin({ ...loginLess, password: 'hash' }), false, 'no username');
        assert.equal(UserUtils.hasPasswordLogin({ username: 'alice', password: 'hash' }), true);
        assert.equal(UserUtils.hasPasswordLogin({ username: 'alice', password: 'hash', template: true }), false);
        assert.equal(UserUtils.canHoldSession({ username: 'alice', provider: 'google' }), true);
        assert.equal(UserUtils.canHoldSession({ username: '', password: 'hash' }), false);
    });

    it('password login fails without a username or for a user without a password', async () => {
        for (const username of [undefined, null, '', 123]) {
            const result = await call('GENERATE_NEW_TOKEN', { username, password: 'anything' });
            assert.equal(result.type, 'error');
            assert.equal(result.error, 'Unauthorized request');
            assert.equal(state.saved.length, 0);
        }
        state.user = { ...loginLess, username: 'remote' };
        const result = await call('GENERATE_NEW_TOKEN', { username: 'remote', password: 'anything' });
        assert.equal(result.type, 'error');
        assert.equal(result.error, 'Unauthorized request', 'refused before any password check');
        assert.equal(state.saved.length, 0, 'no refresh token is issued');
    });

    it('an access token without a username does not resolve to a user', async () => {
        const result = await call('GET_USER_BY_TOKEN', { token: 'forged' });
        assert.equal(result.type, 'error');

        tokens.access = { ...tokens.access, username: 'remote' };
        state.user = { ...loginLess, username: 'remote' };
        const noPassword = await call('GET_USER_BY_TOKEN', { token: 'forged' });
        assert.equal(noPassword.type, 'error');
        tokens.access = { ...tokens.access, username: undefined };
    });

    it('a refresh token without a username or for a user without a password gives no access token', async () => {
        const result = await call('GENERATE_NEW_ACCESS_TOKEN', { refreshToken: 'forged' });
        assert.ok(isUnauthorized(result));
        assert.equal(result.body?.accessToken, undefined);

        tokens.refresh = { ...tokens.refresh, name: 'remote' };
        state.user = { ...loginLess, username: 'remote' };
        const noPassword = await call('GENERATE_NEW_ACCESS_TOKEN', { refreshToken: 'forged' });
        assert.equal(noPassword.body?.accessToken, undefined);
        tokens.refresh = { ...tokens.refresh, name: undefined };
    });

    it('a password cannot be set on a user without one', async () => {
        const result = await call('CHANGE_USER_PASSWORD', {
            username: undefined, oldPassword: '', newPassword: 'NewPassword1!', userId: loginLess.id
        });
        assert.equal(result.type, 'error');
        state.user = { ...loginLess, username: 'remote' };
        const noPassword = await call('CHANGE_USER_PASSWORD', {
            username: 'remote', oldPassword: '', newPassword: 'NewPassword1!', userId: loginLess.id
        });
        assert.equal(noPassword.type, 'error');
        assert.equal(state.saved.length, 0);
    });

    it('provider login and lookups do not match a user without a username', async () => {
        const provider = await call('GENERATE_NEW_TOKEN_BASED_ON_USER_PROVIDER', { username: undefined, provider: 'x' });
        assert.equal(provider.type, 'error');
        const lookup = await call('GET_USER', { username: undefined });
        assert.equal(lookup.body, null);
        const update = await call('UPDATE_USER', { username: undefined, item: { did: 'did:x' } });
        assert.equal(update.body, null);
    });

    it('creates the remote user without a username or a password', async () => {
        state.user = null;
        const result = await call('CREATE_REMOTE_USER', {
            did: loginLess.did, hederaAccountId: '0.0.100', parent: 'did:sr'
        });
        assert.equal(result.type, 'response');
        const created = state.saved.at(-1);
        assert.equal(created.did, loginLess.did);
        assert.equal(created.location, 'REMOTE');
        assert.equal(created.parent, 'did:sr');
        assert.equal(created.username, undefined);
        assert.equal(created.password, undefined);
    });

    it('reuses a remote user of the same registry and refuses any other user with the DID', async () => {
        const reused = await call('CREATE_REMOTE_USER', { did: loginLess.did, hederaAccountId: '0.0.100', parent: 'did:sr' });
        assert.equal(reused.type, 'response');
        assert.equal(state.saved.length, 0);

        for (const user of [
            { ...loginLess, location: 'LOCAL' },
            { ...loginLess, parent: 'did:other-sr' },
            { ...loginLess, hederaAccountId: '0.0.200' },
            { ...loginLess, template: true },
        ]) {
            state.user = user;
            const result = await call('CREATE_REMOTE_USER', { did: loginLess.did, hederaAccountId: '0.0.100', parent: 'did:sr' });
            assert.equal(result.type, 'error');
        }
        assert.equal(state.saved.length, 0);
    });

    it('marks only newly created remote users as created', async () => {
        state.user = null;
        const created = await call('CREATE_REMOTE_USER', { did: loginLess.did, hederaAccountId: '0.0.100', parent: 'did:sr' });
        assert.equal(created.body.created, true);

        state.user = { ...loginLess };
        const reused = await call('CREATE_REMOTE_USER', { did: loginLess.did, hederaAccountId: '0.0.100', parent: 'did:sr' });
        assert.equal(reused.body.created, false);
    });
});

describe('@unit auth-service – role handlers do not match a user without a username', function () {
    this.timeout(60000);
    let roleHandlers;

    before(async () => {
        capturedHandlers.length = 0;
        const overrides = { '@guardian/common': { DatabaseServer: FakeDatabaseServer } };
        const utils = await loadService('../dist/utils/index.js', overrides);
        const { RoleService } = await loadService('../dist/api/role-service.js', overrides, { '#utils': utils });
        new RoleService().registerListeners({ async error() {}, async info() {}, async warn() {} });
        roleHandlers = new Map(capturedHandlers.map(({ event, cb }) => [event, cb]));
    });

    it('refuses to update, delegate or read the roles of an empty username', async () => {
        state.user = { ...loginLess };
        const owner = { creator: 'did:sr', owner: 'did:sr' };
        for (const username of [undefined, null, '']) {
            const update = await roleHandlers.get('Enum.UPDATE_USER_ROLE')({ username, userRoles: ['r'], owner });
            const delegate = await roleHandlers.get('Enum.DELEGATE_USER_ROLE')({ username, userRoles: ['r'], owner });
            const read = await roleHandlers.get('Enum.GET_USER_PERMISSIONS')({ username });
            assert.equal(update.type, 'error');
            assert.equal(update.error, 'User does not exist');
            assert.equal(delegate.type, 'error');
            assert.equal(read.body, null);
        }
    });
});
