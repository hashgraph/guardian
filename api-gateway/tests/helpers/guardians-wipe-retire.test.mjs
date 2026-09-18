import assert from 'node:assert/strict';
import { ContractAPI, ContractType } from '@guardian/interfaces';
import { Guardians } from '../../dist/helpers/guardians.js';

function make(canned = { ok: true }) {
    const g = new Guardians(undefined);
    const calls = [];
    g.sendMessage = async (subject, data) => {
        calls.push([subject, data]);
        return canned;
    };
    return { g, calls };
}

const owner = { creator: 'did:owner', owner: 'did:owner', id: 'o1' };
const owner2 = { creator: 'did:other', owner: 'did:other', id: 'o2' };

function keys(obj) {
    return Object.keys(obj).sort();
}

describe('Guardians wipe + retire @unit', () => {
    describe('getWipeRequests', () => {
        it('uses GET_WIPE_REQUESTS subject', async () => {
            const { g, calls } = make();
            await g.getWipeRequests(owner, 'c1', 1, 10);
            assert.equal(calls[0][0], ContractAPI.GET_WIPE_REQUESTS);
        });
        it('forwards all four args', async () => {
            const { g, calls } = make();
            await g.getWipeRequests(owner, 'c1', 1, 10);
            assert.deepEqual(calls[0][1], { owner, contractId: 'c1', pageIndex: 1, pageSize: 10 });
        });
        it('threads owner reference', async () => {
            const { g, calls } = make();
            await g.getWipeRequests(owner2, 'c1', 1, 10);
            assert.equal(calls[0][1].owner, owner2);
        });
        it('contractId optional defaults to undefined', async () => {
            const { g, calls } = make();
            await g.getWipeRequests(owner);
            assert.equal(calls[0][1].contractId, undefined);
        });
        it('pageIndex and pageSize default to undefined', async () => {
            const { g, calls } = make();
            await g.getWipeRequests(owner);
            assert.equal(calls[0][1].pageIndex, undefined);
            assert.equal(calls[0][1].pageSize, undefined);
        });
        it('payload has exactly owner, contractId, pageIndex, pageSize', async () => {
            const { g, calls } = make();
            await g.getWipeRequests(owner, 'c1', 1, 10);
            assert.deepEqual(keys(calls[0][1]), ['contractId', 'owner', 'pageIndex', 'pageSize']);
        });
        it('returns canned response', async () => {
            const { g } = make([[{ user: 'u' }], 1]);
            const r = await g.getWipeRequests(owner);
            assert.deepEqual(r, [[{ user: 'u' }], 1]);
        });
        it('sends exactly one message', async () => {
            const { g, calls } = make();
            await g.getWipeRequests(owner);
            assert.equal(calls.length, 1);
        });
    });

    describe('enableWipeRequests', () => {
        it('uses ENABLE_WIPE_REQUESTS subject and payload', async () => {
            const { g, calls } = make();
            await g.enableWipeRequests(owner, 'id-1');
            assert.deepEqual(calls[0], [ContractAPI.ENABLE_WIPE_REQUESTS, { owner, id: 'id-1' }]);
        });
        it('payload has exactly owner and id', async () => {
            const { g, calls } = make();
            await g.enableWipeRequests(owner, 'id-1');
            assert.deepEqual(keys(calls[0][1]), ['id', 'owner']);
        });
        it('forwards distinct id', async () => {
            const { g, calls } = make();
            await g.enableWipeRequests(owner, 'other-id');
            assert.equal(calls[0][1].id, 'other-id');
        });
        it('returns canned boolean', async () => {
            const { g } = make(true);
            assert.equal(await g.enableWipeRequests(owner, 'id-1'), true);
        });
    });

    describe('disableWipeRequests', () => {
        it('uses DISABLE_WIPE_REQUESTS subject and payload', async () => {
            const { g, calls } = make();
            await g.disableWipeRequests(owner, 'id-1');
            assert.deepEqual(calls[0], [ContractAPI.DISABLE_WIPE_REQUESTS, { owner, id: 'id-1' }]);
        });
        it('payload has exactly owner and id', async () => {
            const { g, calls } = make();
            await g.disableWipeRequests(owner, 'id-1');
            assert.deepEqual(keys(calls[0][1]), ['id', 'owner']);
        });
        it('returns canned boolean', async () => {
            const { g } = make(false);
            assert.equal(await g.disableWipeRequests(owner, 'id-1'), false);
        });
    });

    describe('approveWipeRequest', () => {
        it('uses APPROVE_WIPE_REQUEST subject and payload', async () => {
            const { g, calls } = make();
            await g.approveWipeRequest(owner, 'r1');
            assert.deepEqual(calls[0], [ContractAPI.APPROVE_WIPE_REQUEST, { owner, requestId: 'r1' }]);
        });
        it('payload has exactly owner and requestId', async () => {
            const { g, calls } = make();
            await g.approveWipeRequest(owner, 'r1');
            assert.deepEqual(keys(calls[0][1]), ['owner', 'requestId']);
        });
        it('forwards distinct requestId', async () => {
            const { g, calls } = make();
            await g.approveWipeRequest(owner, 'rq-99');
            assert.equal(calls[0][1].requestId, 'rq-99');
        });
        it('returns canned boolean', async () => {
            const { g } = make(true);
            assert.equal(await g.approveWipeRequest(owner, 'r1'), true);
        });
    });

    describe('rejectWipeRequest', () => {
        it('uses REJECT_WIPE_REQUEST subject', async () => {
            const { g, calls } = make();
            await g.rejectWipeRequest(owner, 'r1');
            assert.equal(calls[0][0], ContractAPI.REJECT_WIPE_REQUEST);
        });
        it('ban defaults to false', async () => {
            const { g, calls } = make();
            await g.rejectWipeRequest(owner, 'r1');
            assert.deepEqual(calls[0][1], { owner, requestId: 'r1', ban: false });
        });
        it('ban true honored', async () => {
            const { g, calls } = make();
            await g.rejectWipeRequest(owner, 'r1', true);
            assert.equal(calls[0][1].ban, true);
        });
        it('ban false explicit honored', async () => {
            const { g, calls } = make();
            await g.rejectWipeRequest(owner, 'r1', false);
            assert.equal(calls[0][1].ban, false);
        });
        it('payload has exactly owner, requestId, ban', async () => {
            const { g, calls } = make();
            await g.rejectWipeRequest(owner, 'r1');
            assert.deepEqual(keys(calls[0][1]), ['ban', 'owner', 'requestId']);
        });
        it('returns canned boolean', async () => {
            const { g } = make(true);
            assert.equal(await g.rejectWipeRequest(owner, 'r1', true), true);
        });
    });

    describe('clearWipeRequests', () => {
        it('uses CLEAR_WIPE_REQUESTS subject', async () => {
            const { g, calls } = make();
            await g.clearWipeRequests(owner, 'id-1', '0.0.5');
            assert.equal(calls[0][0], ContractAPI.CLEAR_WIPE_REQUESTS);
        });
        it('forwards hederaId when provided', async () => {
            const { g, calls } = make();
            await g.clearWipeRequests(owner, 'id-1', '0.0.5');
            assert.deepEqual(calls[0][1], { owner, id: 'id-1', hederaId: '0.0.5' });
        });
        it('hederaId undefined when omitted', async () => {
            const { g, calls } = make();
            await g.clearWipeRequests(owner, 'id-1');
            assert.equal(calls[0][1].hederaId, undefined);
        });
        it('payload always has owner, id, hederaId keys', async () => {
            const { g, calls } = make();
            await g.clearWipeRequests(owner, 'id-1');
            assert.deepEqual(keys(calls[0][1]), ['hederaId', 'id', 'owner']);
        });
        it('returns canned boolean', async () => {
            const { g } = make(true);
            assert.equal(await g.clearWipeRequests(owner, 'id-1'), true);
        });
    });

    describe('addWipeAdmin', () => {
        it('uses ADD_WIPE_ADMIN subject and payload', async () => {
            const { g, calls } = make();
            await g.addWipeAdmin(owner, 'id-1', '0.0.5');
            assert.deepEqual(calls[0], [ContractAPI.ADD_WIPE_ADMIN, { owner, id: 'id-1', hederaId: '0.0.5' }]);
        });
        it('payload has exactly owner, id, hederaId', async () => {
            const { g, calls } = make();
            await g.addWipeAdmin(owner, 'id-1', '0.0.5');
            assert.deepEqual(keys(calls[0][1]), ['hederaId', 'id', 'owner']);
        });
        it('forwards distinct hederaId', async () => {
            const { g, calls } = make();
            await g.addWipeAdmin(owner, 'id-1', '0.0.99');
            assert.equal(calls[0][1].hederaId, '0.0.99');
        });
        it('returns canned boolean', async () => {
            const { g } = make(true);
            assert.equal(await g.addWipeAdmin(owner, 'id-1', '0.0.5'), true);
        });
    });

    describe('removeWipeAdmin', () => {
        it('uses REMOVE_WIPE_ADMIN subject and payload', async () => {
            const { g, calls } = make();
            await g.removeWipeAdmin(owner, 'id-1', '0.0.5');
            assert.deepEqual(calls[0], [ContractAPI.REMOVE_WIPE_ADMIN, { owner, id: 'id-1', hederaId: '0.0.5' }]);
        });
        it('payload has exactly owner, id, hederaId', async () => {
            const { g, calls } = make();
            await g.removeWipeAdmin(owner, 'id-1', '0.0.5');
            assert.deepEqual(keys(calls[0][1]), ['hederaId', 'id', 'owner']);
        });
        it('returns canned boolean', async () => {
            const { g } = make(false);
            assert.equal(await g.removeWipeAdmin(owner, 'id-1', '0.0.5'), false);
        });
    });

    describe('addWipeManager', () => {
        it('uses ADD_WIPE_MANAGER subject and payload', async () => {
            const { g, calls } = make();
            await g.addWipeManager(owner, 'id-1', '0.0.5');
            assert.deepEqual(calls[0], [ContractAPI.ADD_WIPE_MANAGER, { owner, id: 'id-1', hederaId: '0.0.5' }]);
        });
        it('payload has exactly owner, id, hederaId', async () => {
            const { g, calls } = make();
            await g.addWipeManager(owner, 'id-1', '0.0.5');
            assert.deepEqual(keys(calls[0][1]), ['hederaId', 'id', 'owner']);
        });
        it('returns canned boolean', async () => {
            const { g } = make(true);
            assert.equal(await g.addWipeManager(owner, 'id-1', '0.0.5'), true);
        });
    });

    describe('removeWipeManager', () => {
        it('uses REMOVE_WIPE_MANAGER subject and payload', async () => {
            const { g, calls } = make();
            await g.removeWipeManager(owner, 'id-1', '0.0.5');
            assert.deepEqual(calls[0], [ContractAPI.REMOVE_WIPE_MANAGER, { owner, id: 'id-1', hederaId: '0.0.5' }]);
        });
        it('payload has exactly owner, id, hederaId', async () => {
            const { g, calls } = make();
            await g.removeWipeManager(owner, 'id-1', '0.0.5');
            assert.deepEqual(keys(calls[0][1]), ['hederaId', 'id', 'owner']);
        });
        it('returns canned boolean', async () => {
            const { g } = make(false);
            assert.equal(await g.removeWipeManager(owner, 'id-1', '0.0.5'), false);
        });
    });

    describe('addWipeWiper', () => {
        it('uses ADD_WIPE_WIPER subject', async () => {
            const { g, calls } = make();
            await g.addWipeWiper(owner, 'id-1', '0.0.5', 'T');
            assert.equal(calls[0][0], ContractAPI.ADD_WIPE_WIPER);
        });
        it('forwards tokenId when provided', async () => {
            const { g, calls } = make();
            await g.addWipeWiper(owner, 'id-1', '0.0.5', 'T');
            assert.deepEqual(calls[0][1], { owner, id: 'id-1', hederaId: '0.0.5', tokenId: 'T' });
        });
        it('tokenId undefined when omitted', async () => {
            const { g, calls } = make();
            await g.addWipeWiper(owner, 'id-1', '0.0.5');
            assert.equal(calls[0][1].tokenId, undefined);
        });
        it('payload always has owner, id, hederaId, tokenId keys', async () => {
            const { g, calls } = make();
            await g.addWipeWiper(owner, 'id-1', '0.0.5');
            assert.deepEqual(keys(calls[0][1]), ['hederaId', 'id', 'owner', 'tokenId']);
        });
        it('returns canned boolean', async () => {
            const { g } = make(true);
            assert.equal(await g.addWipeWiper(owner, 'id-1', '0.0.5', 'T'), true);
        });
    });

    describe('removeWipeWiper', () => {
        it('uses REMOVE_WIPE_WIPER subject', async () => {
            const { g, calls } = make();
            await g.removeWipeWiper(owner, 'id-1', '0.0.5', 'T');
            assert.equal(calls[0][0], ContractAPI.REMOVE_WIPE_WIPER);
        });
        it('forwards tokenId when provided', async () => {
            const { g, calls } = make();
            await g.removeWipeWiper(owner, 'id-1', '0.0.5', 'T');
            assert.deepEqual(calls[0][1], { owner, id: 'id-1', hederaId: '0.0.5', tokenId: 'T' });
        });
        it('tokenId undefined when omitted', async () => {
            const { g, calls } = make();
            await g.removeWipeWiper(owner, 'id-1', '0.0.5');
            assert.equal(calls[0][1].tokenId, undefined);
        });
        it('payload always has owner, id, hederaId, tokenId keys', async () => {
            const { g, calls } = make();
            await g.removeWipeWiper(owner, 'id-1', '0.0.5');
            assert.deepEqual(keys(calls[0][1]), ['hederaId', 'id', 'owner', 'tokenId']);
        });
        it('returns canned boolean', async () => {
            const { g } = make(false);
            assert.equal(await g.removeWipeWiper(owner, 'id-1', '0.0.5'), false);
        });
    });

    describe('syncRetirePools', () => {
        it('uses SYNC_RETIRE_POOLS subject and payload', async () => {
            const { g, calls } = make();
            await g.syncRetirePools(owner, 'id-1');
            assert.deepEqual(calls[0], [ContractAPI.SYNC_RETIRE_POOLS, { owner, id: 'id-1' }]);
        });
        it('payload has exactly owner and id', async () => {
            const { g, calls } = make();
            await g.syncRetirePools(owner, 'id-1');
            assert.deepEqual(keys(calls[0][1]), ['id', 'owner']);
        });
        it('returns canned sync date string', async () => {
            const { g } = make('2026-01-01');
            assert.equal(await g.syncRetirePools(owner, 'id-1'), '2026-01-01');
        });
    });

    describe('getRetireRequests', () => {
        it('uses GET_RETIRE_REQUESTS subject', async () => {
            const { g, calls } = make();
            await g.getRetireRequests(owner, 'c1', 1, 10);
            assert.equal(calls[0][0], ContractAPI.GET_RETIRE_REQUESTS);
        });
        it('forwards all four args', async () => {
            const { g, calls } = make();
            await g.getRetireRequests(owner, 'c1', 1, 10);
            assert.deepEqual(calls[0][1], { owner, contractId: 'c1', pageIndex: 1, pageSize: 10 });
        });
        it('contractId optional defaults to undefined', async () => {
            const { g, calls } = make();
            await g.getRetireRequests(owner);
            assert.equal(calls[0][1].contractId, undefined);
        });
        it('paging defaults to undefined', async () => {
            const { g, calls } = make();
            await g.getRetireRequests(owner);
            assert.equal(calls[0][1].pageIndex, undefined);
            assert.equal(calls[0][1].pageSize, undefined);
        });
        it('payload has exactly owner, contractId, pageIndex, pageSize', async () => {
            const { g, calls } = make();
            await g.getRetireRequests(owner);
            assert.deepEqual(keys(calls[0][1]), ['contractId', 'owner', 'pageIndex', 'pageSize']);
        });
        it('returns canned response', async () => {
            const { g } = make([{ id: 'r' }, 1]);
            assert.deepEqual(await g.getRetireRequests(owner), [{ id: 'r' }, 1]);
        });
    });

    describe('getRetirePools', () => {
        it('uses GET_RETIRE_POOLS subject', async () => {
            const { g, calls } = make();
            await g.getRetirePools(owner, ['T'], 'c1', 1, 10);
            assert.equal(calls[0][0], ContractAPI.GET_RETIRE_POOLS);
        });
        it('forwards tokens and paging', async () => {
            const { g, calls } = make();
            await g.getRetirePools(owner, ['T'], 'c1', 1, 10);
            assert.deepEqual(calls[0][1], { owner, contractId: 'c1', pageIndex: 1, pageSize: 10, tokens: ['T'] });
        });
        it('tokens optional defaults to undefined', async () => {
            const { g, calls } = make();
            await g.getRetirePools(owner);
            assert.equal(calls[0][1].tokens, undefined);
        });
        it('contractId optional defaults to undefined', async () => {
            const { g, calls } = make();
            await g.getRetirePools(owner);
            assert.equal(calls[0][1].contractId, undefined);
        });
        it('payload has exactly owner, contractId, pageIndex, pageSize, tokens', async () => {
            const { g, calls } = make();
            await g.getRetirePools(owner);
            assert.deepEqual(keys(calls[0][1]), ['contractId', 'owner', 'pageIndex', 'pageSize', 'tokens']);
        });
        it('forwards multi-element tokens array', async () => {
            const { g, calls } = make();
            await g.getRetirePools(owner, ['A', 'B'], 'c1', 0, 5);
            assert.deepEqual(calls[0][1].tokens, ['A', 'B']);
        });
        it('returns canned response', async () => {
            const { g } = make([{ id: 'p' }, 2]);
            assert.deepEqual(await g.getRetirePools(owner), [{ id: 'p' }, 2]);
        });
    });

    describe('clearRetireRequests', () => {
        it('uses CLEAR_RETIRE_REQUESTS subject and payload', async () => {
            const { g, calls } = make();
            await g.clearRetireRequests(owner, 'id-1');
            assert.deepEqual(calls[0], [ContractAPI.CLEAR_RETIRE_REQUESTS, { owner, id: 'id-1' }]);
        });
        it('payload has exactly owner and id', async () => {
            const { g, calls } = make();
            await g.clearRetireRequests(owner, 'id-1');
            assert.deepEqual(keys(calls[0][1]), ['id', 'owner']);
        });
        it('returns canned boolean', async () => {
            const { g } = make(true);
            assert.equal(await g.clearRetireRequests(owner, 'id-1'), true);
        });
    });

    describe('clearRetirePools', () => {
        it('uses CLEAR_RETIRE_POOLS subject and payload', async () => {
            const { g, calls } = make();
            await g.clearRetirePools(owner, 'id-1');
            assert.deepEqual(calls[0], [ContractAPI.CLEAR_RETIRE_POOLS, { owner, id: 'id-1' }]);
        });
        it('payload has exactly owner and id', async () => {
            const { g, calls } = make();
            await g.clearRetirePools(owner, 'id-1');
            assert.deepEqual(keys(calls[0][1]), ['id', 'owner']);
        });
        it('returns canned boolean', async () => {
            const { g } = make(false);
            assert.equal(await g.clearRetirePools(owner, 'id-1'), false);
        });
    });

    describe('setRetirePool', () => {
        it('uses SET_RETIRE_POOLS subject', async () => {
            const { g, calls } = make();
            await g.setRetirePool(owner, 'id-1', { tokens: [], immediately: true });
            assert.equal(calls[0][0], ContractAPI.SET_RETIRE_POOLS);
        });
        it('forwards options object by reference', async () => {
            const { g, calls } = make();
            const options = { tokens: [{ token: 'T', count: 1 }], immediately: false };
            await g.setRetirePool(owner, 'id-1', options);
            assert.equal(calls[0][1].options, options);
        });
        it('payload has exactly owner, id, options', async () => {
            const { g, calls } = make();
            await g.setRetirePool(owner, 'id-1', { tokens: [], immediately: true });
            assert.deepEqual(keys(calls[0][1]), ['id', 'options', 'owner']);
        });
        it('preserves immediately flag', async () => {
            const { g, calls } = make();
            await g.setRetirePool(owner, 'id-1', { tokens: [], immediately: false });
            assert.equal(calls[0][1].options.immediately, false);
        });
        it('returns canned pool', async () => {
            const { g } = make({ poolId: 'p1' });
            assert.deepEqual(await g.setRetirePool(owner, 'id-1', { tokens: [], immediately: true }), { poolId: 'p1' });
        });
    });

    describe('unsetRetirePool', () => {
        it('uses UNSET_RETIRE_POOLS subject and payload', async () => {
            const { g, calls } = make();
            await g.unsetRetirePool(owner, 'p1');
            assert.deepEqual(calls[0], [ContractAPI.UNSET_RETIRE_POOLS, { owner, poolId: 'p1' }]);
        });
        it('payload has exactly owner and poolId', async () => {
            const { g, calls } = make();
            await g.unsetRetirePool(owner, 'p1');
            assert.deepEqual(keys(calls[0][1]), ['owner', 'poolId']);
        });
        it('forwards distinct poolId', async () => {
            const { g, calls } = make();
            await g.unsetRetirePool(owner, 'pool-xyz');
            assert.equal(calls[0][1].poolId, 'pool-xyz');
        });
        it('returns canned boolean', async () => {
            const { g } = make(true);
            assert.equal(await g.unsetRetirePool(owner, 'p1'), true);
        });
    });

    describe('unsetRetireRequest', () => {
        it('uses UNSET_RETIRE_REQUEST subject and payload', async () => {
            const { g, calls } = make();
            await g.unsetRetireRequest(owner, 'r1');
            assert.deepEqual(calls[0], [ContractAPI.UNSET_RETIRE_REQUEST, { owner, requestId: 'r1' }]);
        });
        it('payload has exactly owner and requestId', async () => {
            const { g, calls } = make();
            await g.unsetRetireRequest(owner, 'r1');
            assert.deepEqual(keys(calls[0][1]), ['owner', 'requestId']);
        });
        it('returns canned boolean', async () => {
            const { g } = make(false);
            assert.equal(await g.unsetRetireRequest(owner, 'r1'), false);
        });
    });

    describe('retire', () => {
        it('uses RETIRE subject', async () => {
            const { g, calls } = make();
            await g.retire(owner, 'p1', [{ token: 'T' }]);
            assert.equal(calls[0][0], ContractAPI.RETIRE);
        });
        it('forwards poolId and tokens', async () => {
            const { g, calls } = make();
            await g.retire(owner, 'p1', [{ token: 'T' }]);
            assert.deepEqual(calls[0][1], { owner, poolId: 'p1', tokens: [{ token: 'T' }] });
        });
        it('payload has exactly owner, poolId, tokens', async () => {
            const { g, calls } = make();
            await g.retire(owner, 'p1', []);
            assert.deepEqual(keys(calls[0][1]), ['owner', 'poolId', 'tokens']);
        });
        it('forwards tokens array by reference', async () => {
            const { g, calls } = make();
            const tokens = [{ token: 'A' }, { token: 'B' }];
            await g.retire(owner, 'p1', tokens);
            assert.equal(calls[0][1].tokens, tokens);
        });
        it('forwards empty tokens array', async () => {
            const { g, calls } = make();
            await g.retire(owner, 'p1', []);
            assert.deepEqual(calls[0][1].tokens, []);
        });
        it('returns canned boolean', async () => {
            const { g } = make(true);
            assert.equal(await g.retire(owner, 'p1', []), true);
        });
    });

    describe('approveRetire', () => {
        it('uses APPROVE_RETIRE subject and payload', async () => {
            const { g, calls } = make();
            await g.approveRetire(owner, 'r1');
            assert.deepEqual(calls[0], [ContractAPI.APPROVE_RETIRE, { owner, requestId: 'r1' }]);
        });
        it('payload has exactly owner and requestId', async () => {
            const { g, calls } = make();
            await g.approveRetire(owner, 'r1');
            assert.deepEqual(keys(calls[0][1]), ['owner', 'requestId']);
        });
        it('returns canned boolean', async () => {
            const { g } = make(true);
            assert.equal(await g.approveRetire(owner, 'r1'), true);
        });
    });

    describe('cancelRetire', () => {
        it('uses CANCEL_RETIRE subject and payload', async () => {
            const { g, calls } = make();
            await g.cancelRetire(owner, 'r1');
            assert.deepEqual(calls[0], [ContractAPI.CANCEL_RETIRE, { owner, requestId: 'r1' }]);
        });
        it('payload has exactly owner and requestId', async () => {
            const { g, calls } = make();
            await g.cancelRetire(owner, 'r1');
            assert.deepEqual(keys(calls[0][1]), ['owner', 'requestId']);
        });
        it('forwards distinct requestId', async () => {
            const { g, calls } = make();
            await g.cancelRetire(owner, 'req-2');
            assert.equal(calls[0][1].requestId, 'req-2');
        });
        it('returns canned boolean', async () => {
            const { g } = make(false);
            assert.equal(await g.cancelRetire(owner, 'r1'), false);
        });
    });

    describe('addRetireAdmin', () => {
        it('uses ADD_RETIRE_ADMIN subject and payload', async () => {
            const { g, calls } = make();
            await g.addRetireAdmin(owner, 'id-1', '0.0.5');
            assert.deepEqual(calls[0], [ContractAPI.ADD_RETIRE_ADMIN, { owner, id: 'id-1', hederaId: '0.0.5' }]);
        });
        it('payload has exactly owner, id, hederaId', async () => {
            const { g, calls } = make();
            await g.addRetireAdmin(owner, 'id-1', '0.0.5');
            assert.deepEqual(keys(calls[0][1]), ['hederaId', 'id', 'owner']);
        });
        it('forwards distinct hederaId', async () => {
            const { g, calls } = make();
            await g.addRetireAdmin(owner, 'id-1', '0.0.77');
            assert.equal(calls[0][1].hederaId, '0.0.77');
        });
        it('returns canned boolean', async () => {
            const { g } = make(true);
            assert.equal(await g.addRetireAdmin(owner, 'id-1', '0.0.5'), true);
        });
    });

    describe('removeRetireAdmin', () => {
        it('uses REMOVE_RETIRE_ADMIN subject and payload', async () => {
            const { g, calls } = make();
            await g.removeRetireAdmin(owner, 'id-1', '0.0.5');
            assert.deepEqual(calls[0], [ContractAPI.REMOVE_RETIRE_ADMIN, { owner, id: 'id-1', hederaId: '0.0.5' }]);
        });
        it('payload has exactly owner, id, hederaId', async () => {
            const { g, calls } = make();
            await g.removeRetireAdmin(owner, 'id-1', '0.0.5');
            assert.deepEqual(keys(calls[0][1]), ['hederaId', 'id', 'owner']);
        });
        it('returns canned boolean', async () => {
            const { g } = make(false);
            assert.equal(await g.removeRetireAdmin(owner, 'id-1', '0.0.5'), false);
        });
    });

    describe('getRetireVCs', () => {
        it('uses GET_RETIRE_VCS subject', async () => {
            const { g, calls } = make();
            await g.getRetireVCs(owner, 1, 10);
            assert.equal(calls[0][0], ContractAPI.GET_RETIRE_VCS);
        });
        it('forwards paging', async () => {
            const { g, calls } = make();
            await g.getRetireVCs(owner, 1, 10);
            assert.deepEqual(calls[0][1], { owner, pageIndex: 1, pageSize: 10 });
        });
        it('paging defaults to undefined', async () => {
            const { g, calls } = make();
            await g.getRetireVCs(owner);
            assert.equal(calls[0][1].pageIndex, undefined);
            assert.equal(calls[0][1].pageSize, undefined);
        });
        it('payload has exactly owner, pageIndex, pageSize', async () => {
            const { g, calls } = make();
            await g.getRetireVCs(owner);
            assert.deepEqual(keys(calls[0][1]), ['owner', 'pageIndex', 'pageSize']);
        });
        it('returns canned response', async () => {
            const { g } = make([{ id: 'vc' }, 1]);
            assert.deepEqual(await g.getRetireVCs(owner), [{ id: 'vc' }, 1]);
        });
    });

    describe('getRetireVCsFromIndexer', () => {
        it('uses GET_RETIRE_VCS_FROM_INDEXER subject and payload', async () => {
            const { g, calls } = make();
            await g.getRetireVCsFromIndexer(owner, 'topic-1');
            assert.deepEqual(calls[0], [ContractAPI.GET_RETIRE_VCS_FROM_INDEXER, { owner, contractTopicId: 'topic-1' }]);
        });
        it('payload has exactly owner and contractTopicId', async () => {
            const { g, calls } = make();
            await g.getRetireVCsFromIndexer(owner, 'topic-1');
            assert.deepEqual(keys(calls[0][1]), ['contractTopicId', 'owner']);
        });
        it('forwards distinct contractTopicId', async () => {
            const { g, calls } = make();
            await g.getRetireVCsFromIndexer(owner, '0.0.topic');
            assert.equal(calls[0][1].contractTopicId, '0.0.topic');
        });
        it('returns canned response', async () => {
            const { g } = make([[{ m: 1 }], 1]);
            assert.deepEqual(await g.getRetireVCsFromIndexer(owner, 't'), [[{ m: 1 }], 1]);
        });
    });

    describe('cross-cutting behavior', () => {
        it('each method sends exactly one message', async () => {
            const { g, calls } = make();
            await g.enableWipeRequests(owner, 'id');
            await g.clearRetirePools(owner, 'id');
            await g.retire(owner, 'p', []);
            assert.equal(calls.length, 3);
        });
        it('ContractType enum exposes WIPE and RETIRE', () => {
            assert.equal(ContractType.WIPE, 'WIPE');
            assert.equal(ContractType.RETIRE, 'RETIRE');
        });
        it('every wipe/retire subject is a defined ContractAPI constant', () => {
            const subjects = [
                'GET_WIPE_REQUESTS', 'ENABLE_WIPE_REQUESTS', 'DISABLE_WIPE_REQUESTS',
                'APPROVE_WIPE_REQUEST', 'REJECT_WIPE_REQUEST', 'CLEAR_WIPE_REQUESTS',
                'ADD_WIPE_ADMIN', 'REMOVE_WIPE_ADMIN', 'ADD_WIPE_MANAGER', 'REMOVE_WIPE_MANAGER',
                'ADD_WIPE_WIPER', 'REMOVE_WIPE_WIPER', 'SYNC_RETIRE_POOLS', 'GET_RETIRE_REQUESTS',
                'GET_RETIRE_POOLS', 'CLEAR_RETIRE_REQUESTS', 'CLEAR_RETIRE_POOLS', 'SET_RETIRE_POOLS',
                'UNSET_RETIRE_POOLS', 'UNSET_RETIRE_REQUEST', 'RETIRE', 'APPROVE_RETIRE',
                'CANCEL_RETIRE', 'ADD_RETIRE_ADMIN', 'REMOVE_RETIRE_ADMIN', 'GET_RETIRE_VCS',
                'GET_RETIRE_VCS_FROM_INDEXER'
            ];
            for (const s of subjects) {
                assert.ok(typeof ContractAPI[s] === 'string', `${s} should be a string constant`);
            }
        });
    });
});
