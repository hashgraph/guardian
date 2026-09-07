import { assert } from 'chai';
import { loadAPI, Interfaces } from './_handler-harness.mjs';

/*
 * GENERATE_USER_KEYS writes one row per creation, but the vault slot it fills is
 * addressed by `${user.did}#${item.messageId}` and carries no row id. A second
 * create for the same policy therefore added a second row while setUserKey
 * overwrote the first row's secret: the keys list showed two entries for one
 * policy, only the newer one resolved, and nothing said the older was dead.
 *
 * messageId is free text in the create dialog, so entering the same policy id
 * twice is enough to reach it.
 */

const M = Interfaces.MessageAPI;

let H, state;

function makeState() {
    return { existingKeys: [], saved: [], filters: [] };
}

async function setup() {
    state = makeState();
    const loaded = await loadAPI('../dist/api/profile.service.js', 'profileAPI', {
        '@guardian/common': {
            DatabaseServer: class {
                static async getKeys(filter) {
                    state.filters.push(filter);
                    return state.existingKeys;
                }
                static async saveKey(row) {
                    state.saved.push(row);
                    return { ...row, id: `k-${state.saved.length}` };
                }
            },
            Wallet: class {
                async setUserKey() { }
            },
        },
    });
    H = loaded.handlers;
}

const create = (messageId, did = 'did:x') =>
    H[M.GENERATE_USER_KEYS]({ user: { id: 'u1', did }, messageId });

describe('@unit GENERATE_USER_KEYS duplicate policy keys', () => {
    before(async function () {
        this.timeout(180000);
        await setup();
    });
    beforeEach(() => { state = Object.assign(state, makeState()); });

    it('creates a key when the owner has none for that policy', async () => {
        const r = await create('m1');
        assert.isUndefined(r.error, `unexpected refusal: ${r.error}`);
        assert.lengthOf(state.saved, 1);
    });

    it('refuses a second key for a policy the owner already has', async () => {
        state.existingKeys = [{ id: 'k1', messageId: 'm1', owner: 'did:x' }];
        const r = await create('m1');
        assert.isOk(r.error, 'a duplicate must be refused');
        assert.match(String(r.error), /already exists/i);
        assert.lengthOf(state.saved, 0, 'no second row may be written');
    });

    it('scopes the check to the owner and the policy', async () => {
        // scoping matters both ways: one user's key must not block another's,
        // and a key for a different policy must not block this one
        await create('m1');
        assert.deepEqual(state.filters[0], { messageId: 'm1', owner: 'did:x' });
    });

    it('still allows a different policy for the same owner', async () => {
        state.existingKeys = [];
        const r = await create('m2');
        assert.isUndefined(r.error);
        assert.equal(state.saved[0].messageId, 'm2');
    });
});
