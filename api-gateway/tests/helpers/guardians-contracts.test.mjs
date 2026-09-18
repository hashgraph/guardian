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

describe('Guardians contracts', () => {
    it('getContracts defaults type to RETIRE', async () => {
        const { g, calls } = make();
        await g.getContracts(owner);
        assert.deepEqual(calls[0], [ContractAPI.GET_CONTRACTS, { owner, pageIndex: undefined, pageSize: undefined, type: ContractType.RETIRE }]);
    });

    it('getContracts honors explicit type and paging', async () => {
        const { g, calls } = make();
        await g.getContracts(owner, ContractType.WIPE, 2, 50);
        assert.deepEqual(calls[0], [ContractAPI.GET_CONTRACTS, { owner, pageIndex: 2, pageSize: 50, type: ContractType.WIPE }]);
    });

    it('createContract forwards description and type', async () => {
        const { g, calls } = make();
        await g.createContract(owner, 'desc', ContractType.RETIRE);
        assert.deepEqual(calls[0], [ContractAPI.CREATE_CONTRACT, { owner, description: 'desc', type: ContractType.RETIRE }]);
    });

    it('createContractV2 forwards description and type', async () => {
        const { g, calls } = make();
        await g.createContractV2(owner, 'desc', ContractType.WIPE);
        assert.deepEqual(calls[0], [ContractAPI.CREATE_CONTRACT_V2, { owner, description: 'desc', type: ContractType.WIPE }]);
    });

    it('importContract forwards contractId and description', async () => {
        const { g, calls } = make();
        await g.importContract(owner, '0.0.1', 'd');
        assert.deepEqual(calls[0], [ContractAPI.IMPORT_CONTRACT, { owner, contractId: '0.0.1', description: 'd' }]);
    });

    it('checkContractPermissions forwards id and owner', async () => {
        const { g, calls } = make();
        await g.checkContractPermissions(owner, 'id-1');
        assert.deepEqual(calls[0], [ContractAPI.CONTRACT_PERMISSIONS, { id: 'id-1', owner }]);
    });

    it('removeContract forwards owner and id', async () => {
        const { g, calls } = make();
        await g.removeContract(owner, 'id-1');
        assert.deepEqual(calls[0], [ContractAPI.REMOVE_CONTRACT, { owner, id: 'id-1' }]);
    });

    it('getWipeRequests forwards args', async () => {
        const { g, calls } = make();
        await g.getWipeRequests(owner, 'c1', 1, 10);
        assert.deepEqual(calls[0], [ContractAPI.GET_WIPE_REQUESTS, { owner, contractId: 'c1', pageIndex: 1, pageSize: 10 }]);
    });

    it('enableWipeRequests forwards owner and id', async () => {
        const { g, calls } = make();
        await g.enableWipeRequests(owner, 'id-1');
        assert.deepEqual(calls[0], [ContractAPI.ENABLE_WIPE_REQUESTS, { owner, id: 'id-1' }]);
    });

    it('disableWipeRequests forwards owner and id', async () => {
        const { g, calls } = make();
        await g.disableWipeRequests(owner, 'id-1');
        assert.deepEqual(calls[0], [ContractAPI.DISABLE_WIPE_REQUESTS, { owner, id: 'id-1' }]);
    });

    it('approveWipeRequest forwards requestId', async () => {
        const { g, calls } = make();
        await g.approveWipeRequest(owner, 'r1');
        assert.deepEqual(calls[0], [ContractAPI.APPROVE_WIPE_REQUEST, { owner, requestId: 'r1' }]);
    });

    it('rejectWipeRequest defaults ban to false', async () => {
        const { g, calls } = make();
        await g.rejectWipeRequest(owner, 'r1');
        assert.deepEqual(calls[0], [ContractAPI.REJECT_WIPE_REQUEST, { owner, requestId: 'r1', ban: false }]);
    });

    it('rejectWipeRequest honors ban true', async () => {
        const { g, calls } = make();
        await g.rejectWipeRequest(owner, 'r1', true);
        assert.equal(calls[0][1].ban, true);
    });

    it('clearWipeRequests forwards optional hederaId', async () => {
        const { g, calls } = make();
        await g.clearWipeRequests(owner, 'id-1', '0.0.5');
        assert.deepEqual(calls[0], [ContractAPI.CLEAR_WIPE_REQUESTS, { owner, id: 'id-1', hederaId: '0.0.5' }]);
    });

    it('clearWipeRequests without hederaId sends undefined', async () => {
        const { g, calls } = make();
        await g.clearWipeRequests(owner, 'id-1');
        assert.equal(calls[0][1].hederaId, undefined);
    });

    it('addWipeAdmin forwards hederaId', async () => {
        const { g, calls } = make();
        await g.addWipeAdmin(owner, 'id-1', '0.0.5');
        assert.deepEqual(calls[0], [ContractAPI.ADD_WIPE_ADMIN, { owner, id: 'id-1', hederaId: '0.0.5' }]);
    });

    it('removeWipeAdmin forwards hederaId', async () => {
        const { g, calls } = make();
        await g.removeWipeAdmin(owner, 'id-1', '0.0.5');
        assert.deepEqual(calls[0], [ContractAPI.REMOVE_WIPE_ADMIN, { owner, id: 'id-1', hederaId: '0.0.5' }]);
    });

    it('addWipeManager forwards hederaId', async () => {
        const { g, calls } = make();
        await g.addWipeManager(owner, 'id-1', '0.0.5');
        assert.deepEqual(calls[0], [ContractAPI.ADD_WIPE_MANAGER, { owner, id: 'id-1', hederaId: '0.0.5' }]);
    });

    it('removeWipeManager forwards hederaId', async () => {
        const { g, calls } = make();
        await g.removeWipeManager(owner, 'id-1', '0.0.5');
        assert.deepEqual(calls[0], [ContractAPI.REMOVE_WIPE_MANAGER, { owner, id: 'id-1', hederaId: '0.0.5' }]);
    });

    it('addWipeWiper forwards optional tokenId', async () => {
        const { g, calls } = make();
        await g.addWipeWiper(owner, 'id-1', '0.0.5', 'T');
        assert.deepEqual(calls[0], [ContractAPI.ADD_WIPE_WIPER, { owner, id: 'id-1', hederaId: '0.0.5', tokenId: 'T' }]);
    });

    it('addWipeWiper without tokenId sends undefined', async () => {
        const { g, calls } = make();
        await g.addWipeWiper(owner, 'id-1', '0.0.5');
        assert.equal(calls[0][1].tokenId, undefined);
    });

    it('removeWipeWiper forwards optional tokenId', async () => {
        const { g, calls } = make();
        await g.removeWipeWiper(owner, 'id-1', '0.0.5', 'T');
        assert.deepEqual(calls[0], [ContractAPI.REMOVE_WIPE_WIPER, { owner, id: 'id-1', hederaId: '0.0.5', tokenId: 'T' }]);
    });

    it('syncRetirePools forwards owner and id', async () => {
        const { g, calls } = make();
        await g.syncRetirePools(owner, 'id-1');
        assert.deepEqual(calls[0], [ContractAPI.SYNC_RETIRE_POOLS, { owner, id: 'id-1' }]);
    });

    it('getRetireRequests forwards args', async () => {
        const { g, calls } = make();
        await g.getRetireRequests(owner, 'c1', 1, 10);
        assert.deepEqual(calls[0], [ContractAPI.GET_RETIRE_REQUESTS, { owner, contractId: 'c1', pageIndex: 1, pageSize: 10 }]);
    });

    it('getRetirePools forwards tokens', async () => {
        const { g, calls } = make();
        await g.getRetirePools(owner, ['T'], 'c1', 1, 10);
        assert.deepEqual(calls[0], [ContractAPI.GET_RETIRE_POOLS, { owner, contractId: 'c1', pageIndex: 1, pageSize: 10, tokens: ['T'] }]);
    });

    it('clearRetireRequests forwards owner and id', async () => {
        const { g, calls } = make();
        await g.clearRetireRequests(owner, 'id-1');
        assert.deepEqual(calls[0], [ContractAPI.CLEAR_RETIRE_REQUESTS, { owner, id: 'id-1' }]);
    });

    it('clearRetirePools forwards owner and id', async () => {
        const { g, calls } = make();
        await g.clearRetirePools(owner, 'id-1');
        assert.deepEqual(calls[0], [ContractAPI.CLEAR_RETIRE_POOLS, { owner, id: 'id-1' }]);
    });

    it('setRetirePool forwards options', async () => {
        const { g, calls } = make();
        const options = { tokens: [], immediately: true };
        await g.setRetirePool(owner, 'id-1', options);
        assert.deepEqual(calls[0], [ContractAPI.SET_RETIRE_POOLS, { owner, id: 'id-1', options }]);
    });

    it('unsetRetirePool forwards poolId', async () => {
        const { g, calls } = make();
        await g.unsetRetirePool(owner, 'p1');
        assert.deepEqual(calls[0], [ContractAPI.UNSET_RETIRE_POOLS, { owner, poolId: 'p1' }]);
    });

    it('unsetRetireRequest forwards requestId', async () => {
        const { g, calls } = make();
        await g.unsetRetireRequest(owner, 'r1');
        assert.deepEqual(calls[0], [ContractAPI.UNSET_RETIRE_REQUEST, { owner, requestId: 'r1' }]);
    });

    it('retire forwards poolId and tokens', async () => {
        const { g, calls } = make();
        await g.retire(owner, 'p1', [{ token: 'T' }]);
        assert.deepEqual(calls[0], [ContractAPI.RETIRE, { owner, poolId: 'p1', tokens: [{ token: 'T' }] }]);
    });

    it('approveRetire forwards requestId', async () => {
        const { g, calls } = make();
        await g.approveRetire(owner, 'r1');
        assert.deepEqual(calls[0], [ContractAPI.APPROVE_RETIRE, { owner, requestId: 'r1' }]);
    });

    it('cancelRetire forwards requestId', async () => {
        const { g, calls } = make();
        await g.cancelRetire(owner, 'r1');
        assert.deepEqual(calls[0], [ContractAPI.CANCEL_RETIRE, { owner, requestId: 'r1' }]);
    });

    it('addRetireAdmin forwards hederaId', async () => {
        const { g, calls } = make();
        await g.addRetireAdmin(owner, 'id-1', '0.0.5');
        assert.deepEqual(calls[0], [ContractAPI.ADD_RETIRE_ADMIN, { owner, id: 'id-1', hederaId: '0.0.5' }]);
    });

    it('removeRetireAdmin forwards hederaId', async () => {
        const { g, calls } = make();
        await g.removeRetireAdmin(owner, 'id-1', '0.0.5');
        assert.deepEqual(calls[0], [ContractAPI.REMOVE_RETIRE_ADMIN, { owner, id: 'id-1', hederaId: '0.0.5' }]);
    });

    it('getRetireVCs forwards paging', async () => {
        const { g, calls } = make();
        await g.getRetireVCs(owner, 1, 10);
        assert.deepEqual(calls[0], [ContractAPI.GET_RETIRE_VCS, { owner, pageIndex: 1, pageSize: 10 }]);
    });

    it('getRetireVCsFromIndexer forwards contractTopicId', async () => {
        const { g, calls } = make();
        await g.getRetireVCsFromIndexer(owner, 'topic-1');
        assert.deepEqual(calls[0], [ContractAPI.GET_RETIRE_VCS_FROM_INDEXER, { owner, contractTopicId: 'topic-1' }]);
    });
});
