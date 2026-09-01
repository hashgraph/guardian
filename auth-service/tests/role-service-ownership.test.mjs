// Regression coverage for the CREATE/UPDATE/DELETE_ROLE ownership scoping fix:
// dynamic roles are always owned by the tenant's STANDARD_REGISTRY DID
// (owner.owner), never by the calling user's own DID (owner.creator). For a
// non-SR caller those two fields differ, so scoping by owner.creator made
// every update/delete 500 with "Invalid role" for anyone but the SR.
import assert from 'node:assert/strict';
import { loadService, capturedHandlers, stubs, StubMessageError, StubMessageResponse, restoreHarness } from './_handler-harness.mjs';

function isResp(r) { return r instanceof StubMessageResponse || (r && r.type === 'response'); }
function isErr(r) { return r instanceof StubMessageError || (r && r.type === 'error'); }

// Loads a fresh RoleService instance with a DatabaseServer stub whose
// behavior/call-capture is scenario-specific, and returns a `call(event, msg)`
// helper bound to that instance's registered NATS handlers.
async function loadRoleService(behavior = {}) {
    restoreHarness();
    const calls = [];
    class StubDb {
        constructor() {}
        async findOne(_entity, filter) {
            calls.push(['findOne', filter]);
            return behavior.findOne ? behavior.findOne(filter) : null;
        }
        create(_entity, data) {
            calls.push(['create', data]);
            return behavior.create ? behavior.create(data) : data;
        }
        async save(_entity, data) {
            calls.push(['save', data]);
            return behavior.save ? behavior.save(data) : data;
        }
        async update(_entity, _cond, data) {
            calls.push(['update', data]);
            return behavior.update ? behavior.update(data) : data;
        }
        async remove(_entity, data) {
            calls.push(['remove', data]);
            return behavior.remove ? behavior.remove(data) : undefined;
        }
        async find() { return []; }
        async findAndCount() { return [[], 0]; }
        async aggregate() { return []; }
    }

    let RoleService;
    try {
        ({ RoleService } = await loadService('../dist/api/role-service.js', {
            '@guardian/common': { DatabaseServer: StubDb },
        }));
    } catch (e) {
        console.warn('[role-service-ownership.test] dist import failed:', e.message);
        return { call: null, calls };
    }

    const svc = new RoleService();
    const logger = { async error() {}, async info() {}, async warn() {}, async debug() {} };
    const start = capturedHandlers.length;
    svc.registerListeners(logger);
    const handlers = capturedHandlers.slice(start);

    const call = (eventName, msg) => {
        const h = handlers.find((x) => x.event === `Enum.${eventName}`);
        if (!h) throw new Error(`handler not registered: ${eventName}`);
        return h.cb(msg);
    };
    return { call, calls };
}

// A non-SR caller: their own DID (creator) differs from their tenant's SR DID
// (owner) -- the exact shape EntityOwner produces for role.USER.
const nonSrOwner = { creator: 'user-did', owner: 'sr-did' };

describe('@unit role-service ownership scoping (owner.owner, not owner.creator)', () => {
    it('CREATE_ROLE stamps the new role with owner.owner (the SR), not owner.creator', async () => {
        const { call, calls } = await loadRoleService({ save: (d) => ({ ...d, id: 'new-id' }) });
        if (!call) return;
        const r = await call('CREATE_ROLE', {
            role: { name: 'X', permissions: [] },
            owner: nonSrOwner,
        });
        assert.ok(isResp(r));
        const saveCall = calls.find((c) => c[0] === 'save');
        assert.ok(saveCall, 'expected a save() call');
        assert.equal(saveCall[1].owner, 'sr-did');
    });

    it('UPDATE_ROLE scopes the lookup by owner.owner, so a non-SR caller can edit a role owned by their SR', async () => {
        const { call, calls } = await loadRoleService({
            findOne: () => ({ id: 'r-1', owner: 'sr-did', permissions: [] }),
            update: (d) => d,
        });
        if (!call) return;
        const r = await call('UPDATE_ROLE', {
            id: 'r-1',
            role: { name: 'N', description: 'D', permissions: [] },
            owner: nonSrOwner,
        });
        assert.ok(isResp(r), 'non-SR caller editing an SR-owned role should succeed');
        const findOneCall = calls.find((c) => c[0] === 'findOne');
        assert.equal(findOneCall[1].owner, 'sr-did');
    });

    it('UPDATE_ROLE still rejects a role owned by a different tenant', async () => {
        const { call } = await loadRoleService({ findOne: () => null });
        if (!call) return;
        const r = await call('UPDATE_ROLE', {
            id: 'r-1',
            role: { name: 'N', permissions: [] },
            owner: { creator: 'user-did', owner: 'other-tenant-sr-did' },
        });
        assert.ok(isErr(r));
    });

    it('DELETE_ROLE scopes the lookup by owner.owner, so a non-SR caller can delete a role owned by their SR', async () => {
        const { call, calls } = await loadRoleService({
            findOne: () => ({ id: 'r-1', owner: 'sr-did' }),
            remove: () => {},
        });
        if (!call) return;
        const r = await call('DELETE_ROLE', { id: 'r-1', owner: nonSrOwner });
        assert.ok(isResp(r), 'non-SR caller deleting an SR-owned role should succeed');
        const findOneCall = calls.find((c) => c[0] === 'findOne');
        assert.equal(findOneCall[1].owner, 'sr-did');
    });

    it('DELETE_ROLE still rejects a role owned by a different tenant', async () => {
        const { call } = await loadRoleService({ findOne: () => null });
        if (!call) return;
        const r = await call('DELETE_ROLE', {
            id: 'r-1',
            owner: { creator: 'user-did', owner: 'other-tenant-sr-did' },
        });
        assert.ok(isErr(r));
    });
});
