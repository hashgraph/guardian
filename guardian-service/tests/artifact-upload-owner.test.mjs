import { assert } from 'chai';
import { loadAPI, Interfaces } from './_handler-harness.mjs';

/*
 * UPLOAD_ARTIFACT resolved its parent policy/tool by id alone and checked only
 * that it was a draft, never that the caller owned it.
 *
 * The row is written with the UPLOADER as `owner`, and GET_ARTIFACTS filters the
 * listing on `owner`, so the policy owner never sees the injected artifact - while
 * export, comparison and publish key on `policyId` alone and pull it in.
 *
 * DELETE_ARTIFACT in the same service already scopes its lookup by owner, which is
 * what makes this an omission rather than a deliberate design.
 */

const M = Interfaces.MessageAPI;

const OWNER = { creator: 'did:owner', owner: 'did:owner', id: 'u-owner' };
const ATTACKER = { creator: 'did:mallory', owner: 'did:mallory', id: 'u-mallory' };

const artifact = { filename: 'payload.json', buffer: Buffer.from('{}') };

let H, store;

function makeStore() {
    return { policy: null, tool: null, saved: [] };
}

async function setup() {
    store = makeStore();
    const loaded = await loadAPI('../dist/api/artifact.service.js', 'artifactAPI', {
        '@guardian/common': {
            DatabaseServer: class {
                static async getPolicyById() { return store.policy; }
                static async getToolById() { return store.tool; }
                static async saveArtifact(row) { store.saved.push(row); return { ...row, uuid: 'uuid-1' }; }
                static async saveArtifactFile() {}
            },
            getArtifactExtention: () => 'json',
            getArtifactType: () => 'json',
        },
    });
    H = loaded.handlers;
}

const upload = (owner) => H[M.UPLOAD_ARTIFACT]({ artifact, parentId: 'p-1', owner });

describe('@unit UPLOAD_ARTIFACT parent ownership', () => {
    before(async function () {
        this.timeout(180000);
        await setup();
    });
    beforeEach(() => { store = Object.assign(store, makeStore()); });

    it('accepts an upload from the policy owner', async () => {
        store.policy = { id: 'p-1', status: 'DRAFT', owner: OWNER.owner };
        const r = await upload(OWNER);
        assert.isUndefined(r.error, `owner must be allowed: ${r.error}`);
        assert.lengthOf(store.saved, 1);
    });

    it('refuses an upload against another user\'s draft policy', async () => {
        store.policy = { id: 'p-1', status: 'DRAFT', owner: OWNER.owner };
        const r = await upload(ATTACKER);
        assert.isOk(r.error, 'a non-owner must not be able to attach an artifact');
        assert.lengthOf(store.saved, 0, 'nothing may be written when the caller is not the owner');
    });

    it('does not disclose that the policy exists', async () => {
        // Same answer as a missing parent: revealing "exists, but not yours"
        // is itself a disclosure of another tenant's policy ids.
        store.policy = { id: 'p-1', status: 'DRAFT', owner: OWNER.owner };
        const denied = await upload(ATTACKER);

        store.policy = null;
        store.tool = null;
        const missing = await upload(ATTACKER);

        assert.equal(denied.error, missing.error, 'refusal must be indistinguishable from not-found');
        assert.equal(denied.code, missing.code);
    });

    it('refuses an upload against another user\'s tool', async () => {
        store.policy = null;
        store.tool = { id: 'p-1', status: 'DRAFT', owner: OWNER.owner };
        const r = await upload(ATTACKER);
        assert.isOk(r.error, 'the tool branch must be scoped too');
        assert.lengthOf(store.saved, 0);
    });

    it('accepts a tool upload from its owner', async () => {
        store.policy = null;
        store.tool = { id: 'p-1', status: 'DRAFT', owner: OWNER.owner };
        const r = await upload(OWNER);
        assert.isUndefined(r.error, `tool owner must be allowed: ${r.error}`);
        assert.lengthOf(store.saved, 1);
    });

    it('still rejects a non-draft policy for its own owner', async () => {
        // The status gate must survive the new ownership gate.
        store.policy = { id: 'p-1', status: 'PUBLISH', owner: OWNER.owner };
        const r = await upload(OWNER);
        assert.isOk(r.error);
        assert.match(String(r.error), /DRAFT/i);
        assert.lengthOf(store.saved, 0);
    });
});
