import assert from 'node:assert/strict';
import { PolicyEngine } from '../../dist/helpers/policy-engine.js';
import { PolicyEngineEvents } from '@guardian/interfaces';

function makeEngine(canned = 'CANNED') {
    const pe = new PolicyEngine(undefined);
    const calls = [];
    pe.sendMessage = async (subject, data) => {
        calls.push([subject, data]);
        return typeof canned === 'function' ? canned() : canned;
    };
    return { pe, calls };
}

const OWNER = { id: 'owner-1', did: 'did:owner' };
const USER = { id: 'user-1', did: 'did:user' };

describe('PolicyEngine block data', () => {
    it('getPolicyBlocks forwards POLICY_BLOCKS', async () => {
        const { pe, calls } = makeEngine();
        await pe.getPolicyBlocks(USER, 'pid', { p: 1 });
        assert.deepEqual(calls[0], [PolicyEngineEvents.POLICY_BLOCKS, { user: USER, policyId: 'pid', params: { p: 1 } }]);
    });

    it('getBlockData forwards GET_BLOCK_DATA with params', async () => {
        const { pe, calls } = makeEngine();
        await pe.getBlockData(USER, 'pid', 'bid', { p: 1 });
        assert.deepEqual(calls[0], [PolicyEngineEvents.GET_BLOCK_DATA, { user: USER, blockId: 'bid', policyId: 'pid', params: { p: 1 } }]);
    });

    it('getBlockData leaves params undefined when omitted', async () => {
        const { pe, calls } = makeEngine();
        await pe.getBlockData(USER, 'pid', 'bid');
        assert.deepEqual(calls[0], [PolicyEngineEvents.GET_BLOCK_DATA, { user: USER, blockId: 'bid', policyId: 'pid', params: undefined }]);
    });

    it('getBlockDataByTag forwards GET_BLOCK_DATA_BY_TAG', async () => {
        const { pe, calls } = makeEngine();
        await pe.getBlockDataByTag(USER, 'pid', 'tag', { p: 1 });
        assert.deepEqual(calls[0], [PolicyEngineEvents.GET_BLOCK_DATA_BY_TAG, { user: USER, tag: 'tag', policyId: 'pid', params: { p: 1 } }]);
    });

    it('setBlockData forwards SET_BLOCK_DATA with defaults', async () => {
        const { pe, calls } = makeEngine();
        await pe.setBlockData(USER, 'pid', 'bid', { d: 1 });
        assert.deepEqual(calls[0], [PolicyEngineEvents.SET_BLOCK_DATA, {
            user: USER, blockId: 'bid', policyId: 'pid', data: { d: 1 },
            syncEvents: false, history: false, timeout: undefined, waitRemotePolicy: undefined
        }]);
    });

    it('setBlockData forwards all explicit flags', async () => {
        const { pe, calls } = makeEngine();
        await pe.setBlockData(USER, 'pid', 'bid', { d: 1 }, true, true, 5000, true);
        assert.deepEqual(calls[0], [PolicyEngineEvents.SET_BLOCK_DATA, {
            user: USER, blockId: 'bid', policyId: 'pid', data: { d: 1 },
            syncEvents: true, history: true, timeout: 5000, waitRemotePolicy: true
        }]);
    });

    it('setBlockDataByTag forwards SET_BLOCK_DATA_BY_TAG with defaults', async () => {
        const { pe, calls } = makeEngine();
        await pe.setBlockDataByTag(USER, 'pid', 'tag', { d: 1 });
        assert.deepEqual(calls[0], [PolicyEngineEvents.SET_BLOCK_DATA_BY_TAG, {
            user: USER, tag: 'tag', policyId: 'pid', data: { d: 1 },
            syncEvents: false, history: false, timeout: undefined, waitRemotePolicy: undefined
        }]);
    });

    it('retryMint forwards RETRY_MINT', async () => {
        const { pe, calls } = makeEngine();
        await pe.retryMint(USER, 'pid', 'vp');
        assert.deepEqual(calls[0], [PolicyEngineEvents.RETRY_MINT, { user: USER, policyId: 'pid', vpMessageId: 'vp' }]);
    });

    it('getMintRequests forwards GET_MINT_REQUESTS with all filters', async () => {
        const { pe, calls } = makeEngine();
        await pe.getMintRequests(OWNER, 'pid', 'OK', 'acc', 'vp', 1, 20);
        assert.deepEqual(calls[0], [PolicyEngineEvents.GET_MINT_REQUESTS, {
            owner: OWNER, policyId: 'pid', status: 'OK', target: 'acc', vpMessageId: 'vp', pageIndex: 1, pageSize: 20
        }]);
    });

    it('getMintRequests leaves optionals undefined when omitted', async () => {
        const { pe, calls } = makeEngine();
        await pe.getMintRequests(OWNER, 'pid');
        assert.deepEqual(calls[0], [PolicyEngineEvents.GET_MINT_REQUESTS, {
            owner: OWNER, policyId: 'pid', status: undefined, target: undefined, vpMessageId: undefined, pageIndex: undefined, pageSize: undefined
        }]);
    });

    it('getBlockByTagName forwards BLOCK_BY_TAG', async () => {
        const { pe, calls } = makeEngine();
        await pe.getBlockByTagName(USER, 'pid', 'tag');
        assert.deepEqual(calls[0], [PolicyEngineEvents.BLOCK_BY_TAG, { user: USER, tag: 'tag', policyId: 'pid' }]);
    });

    it('getBlockParents forwards GET_BLOCK_PARENTS', async () => {
        const { pe, calls } = makeEngine();
        await pe.getBlockParents(USER, 'pid', 'bid');
        assert.deepEqual(calls[0], [PolicyEngineEvents.GET_BLOCK_PARENTS, { user: USER, blockId: 'bid', policyId: 'pid' }]);
    });

    it('blockAbout forwards BLOCK_ABOUT', async () => {
        const { pe, calls } = makeEngine();
        await pe.blockAbout(USER);
        assert.deepEqual(calls[0], [PolicyEngineEvents.BLOCK_ABOUT, { user: USER }]);
    });

    it('getNavigation forwards GET_POLICY_NAVIGATION', async () => {
        const { pe, calls } = makeEngine();
        await pe.getNavigation(USER, 'pid', { p: 1 });
        assert.deepEqual(calls[0], [PolicyEngineEvents.GET_POLICY_NAVIGATION, { user: USER, policyId: 'pid', params: { p: 1 } }]);
    });

    it('getGroups forwards GET_POLICY_GROUPS with savepointIds', async () => {
        const { pe, calls } = makeEngine();
        await pe.getGroups(USER, 'pid', ['s1']);
        assert.deepEqual(calls[0], [PolicyEngineEvents.GET_POLICY_GROUPS, { user: USER, policyId: 'pid', savepointIds: ['s1'] }]);
    });

    it('getGroups leaves savepointIds undefined when omitted', async () => {
        const { pe, calls } = makeEngine();
        await pe.getGroups(USER, 'pid');
        assert.deepEqual(calls[0], [PolicyEngineEvents.GET_POLICY_GROUPS, { user: USER, policyId: 'pid', savepointIds: undefined }]);
    });

    it('selectGroup forwards SELECT_POLICY_GROUP', async () => {
        const { pe, calls } = makeEngine();
        await pe.selectGroup(USER, 'pid', 'uuid');
        assert.deepEqual(calls[0], [PolicyEngineEvents.SELECT_POLICY_GROUP, { user: USER, policyId: 'pid', uuid: 'uuid' }]);
    });

    it('getMultiPolicy forwards GET_MULTI_POLICY', async () => {
        const { pe, calls } = makeEngine();
        await pe.getMultiPolicy(OWNER, 'pid');
        assert.deepEqual(calls[0], [PolicyEngineEvents.GET_MULTI_POLICY, { owner: OWNER, policyId: 'pid' }]);
    });

    it('setMultiPolicy forwards SET_MULTI_POLICY', async () => {
        const { pe, calls } = makeEngine();
        await pe.setMultiPolicy(OWNER, 'pid', { d: 1 });
        assert.deepEqual(calls[0], [PolicyEngineEvents.SET_MULTI_POLICY, { owner: OWNER, policyId: 'pid', data: { d: 1 } }]);
    });

    it('getTagBlockMap forwards GET_TAG_BLOCK_MAP', async () => {
        const { pe, calls } = makeEngine();
        await pe.getTagBlockMap('pid', OWNER);
        assert.deepEqual(calls[0], [PolicyEngineEvents.GET_TAG_BLOCK_MAP, { policyId: 'pid', owner: OWNER }]);
    });
});

describe('PolicyEngine external data', () => {
    it('receiveExternalData forwards RECEIVE_EXTERNAL_DATA with defaults', async () => {
        const { pe, calls } = makeEngine();
        await pe.receiveExternalData({ d: 1 });
        assert.deepEqual(calls[0], [PolicyEngineEvents.RECEIVE_EXTERNAL_DATA, { data: { d: 1 }, syncEvents: false, history: false }]);
    });

    it('receiveExternalData forwards explicit flags', async () => {
        const { pe, calls } = makeEngine();
        await pe.receiveExternalData({ d: 1 }, true, true);
        assert.deepEqual(calls[0], [PolicyEngineEvents.RECEIVE_EXTERNAL_DATA, { data: { d: 1 }, syncEvents: true, history: true }]);
    });

    it('receiveExternalDataCustom forwards RECEIVE_EXTERNAL_DATA_CUSTOM with defaults', async () => {
        const { pe, calls } = makeEngine();
        await pe.receiveExternalDataCustom({ d: 1 }, 'pid', 'tag');
        assert.deepEqual(calls[0], [PolicyEngineEvents.RECEIVE_EXTERNAL_DATA_CUSTOM, { data: { d: 1 }, policyId: 'pid', blockTag: 'tag', syncEvents: false, history: false }]);
    });

    it('receiveExternalDataCustom forwards explicit flags', async () => {
        const { pe, calls } = makeEngine();
        await pe.receiveExternalDataCustom({ d: 1 }, 'pid', 'tag', true, true);
        assert.deepEqual(calls[0], [PolicyEngineEvents.RECEIVE_EXTERNAL_DATA_CUSTOM, { data: { d: 1 }, policyId: 'pid', blockTag: 'tag', syncEvents: true, history: true }]);
    });
});

describe('PolicyEngine virtual users and dry-run', () => {
    it('getVirtualUsers forwards GET_VIRTUAL_USERS with savepointIds', async () => {
        const { pe, calls } = makeEngine();
        await pe.getVirtualUsers('pid', OWNER, ['s1']);
        assert.deepEqual(calls[0], [PolicyEngineEvents.GET_VIRTUAL_USERS, { policyId: 'pid', owner: OWNER, savepointIds: ['s1'] }]);
    });

    it('getVirtualUsers leaves savepointIds undefined when omitted', async () => {
        const { pe, calls } = makeEngine();
        await pe.getVirtualUsers('pid', OWNER);
        assert.deepEqual(calls[0], [PolicyEngineEvents.GET_VIRTUAL_USERS, { policyId: 'pid', owner: OWNER, savepointIds: undefined }]);
    });

    it('getVirtualUser forwards GET_VIRTUAL_USER', async () => {
        const { pe, calls } = makeEngine();
        await pe.getVirtualUser('pid', 'did:v', OWNER);
        assert.deepEqual(calls[0], [PolicyEngineEvents.GET_VIRTUAL_USER, { policyId: 'pid', did: 'did:v', owner: OWNER }]);
    });

    it('createVirtualUser forwards CREATE_VIRTUAL_USER', async () => {
        const { pe, calls } = makeEngine();
        await pe.createVirtualUser('pid', OWNER, ['s1']);
        assert.deepEqual(calls[0], [PolicyEngineEvents.CREATE_VIRTUAL_USER, { policyId: 'pid', owner: OWNER, savepointIds: ['s1'] }]);
    });

    it('createVirtualUserV2 forwards CREATE_VIRTUAL_USER_V2', async () => {
        const { pe, calls } = makeEngine();
        await pe.createVirtualUserV2('pid', OWNER, ['s1']);
        assert.deepEqual(calls[0], [PolicyEngineEvents.CREATE_VIRTUAL_USER_V2, { policyId: 'pid', owner: OWNER, savepointIds: ['s1'] }]);
    });

    it('loginVirtualUser forwards SET_VIRTUAL_USER', async () => {
        const { pe, calls } = makeEngine();
        await pe.loginVirtualUser('pid', 'did:v', OWNER);
        assert.deepEqual(calls[0], [PolicyEngineEvents.SET_VIRTUAL_USER, { policyId: 'pid', virtualDID: 'did:v', owner: OWNER }]);
    });

    it('restartDryRun forwards RESTART_DRY_RUN', async () => {
        const { pe, calls } = makeEngine();
        await pe.restartDryRun({ m: 1 }, OWNER, 'pid');
        assert.deepEqual(calls[0], [PolicyEngineEvents.RESTART_DRY_RUN, { model: { m: 1 }, owner: OWNER, policyId: 'pid' }]);
    });

    it('runBlock forwards DRY_RUN_BLOCK', async () => {
        const { pe, calls } = makeEngine();
        await pe.runBlock('pid', { c: 1 }, OWNER);
        assert.deepEqual(calls[0], [PolicyEngineEvents.DRY_RUN_BLOCK, { policyId: 'pid', config: { c: 1 }, owner: OWNER }]);
    });

    it('getBlockHistory forwards DRY_RUN_BLOCK_HISTORY', async () => {
        const { pe, calls } = makeEngine();
        await pe.getBlockHistory('pid', 'tag', OWNER);
        assert.deepEqual(calls[0], [PolicyEngineEvents.DRY_RUN_BLOCK_HISTORY, { policyId: 'pid', tag: 'tag', owner: OWNER }]);
    });
});

describe('PolicyEngine savepoints', () => {
    it('getSavepoints forwards GET_SAVEPOINTS', async () => {
        const { pe, calls } = makeEngine();
        await pe.getSavepoints('pid', OWNER);
        assert.deepEqual(calls[0], [PolicyEngineEvents.GET_SAVEPOINTS, { policyId: 'pid', owner: OWNER }]);
    });

    it('getSavepoint forwards GET_SAVEPOINT', async () => {
        const { pe, calls } = makeEngine();
        await pe.getSavepoint('pid', 'sp', OWNER);
        assert.deepEqual(calls[0], [PolicyEngineEvents.GET_SAVEPOINT, { policyId: 'pid', owner: OWNER, savepointId: 'sp' }]);
    });

    it('getSavepointsCount forwards GET_SAVEPOINTS_COUNT with includeDeleted', async () => {
        const { pe, calls } = makeEngine();
        await pe.getSavepointsCount('pid', OWNER, true);
        assert.deepEqual(calls[0], [PolicyEngineEvents.GET_SAVEPOINTS_COUNT, { policyId: 'pid', owner: OWNER, includeDeleted: true }]);
    });

    it('getSavepointsCount leaves includeDeleted undefined when omitted', async () => {
        const { pe, calls } = makeEngine();
        await pe.getSavepointsCount('pid', OWNER);
        assert.deepEqual(calls[0], [PolicyEngineEvents.GET_SAVEPOINTS_COUNT, { policyId: 'pid', owner: OWNER, includeDeleted: undefined }]);
    });

    it('selectSavepoint forwards SELECT_SAVEPOINT', async () => {
        const { pe, calls } = makeEngine();
        await pe.selectSavepoint('pid', 'sp', OWNER);
        assert.deepEqual(calls[0], [PolicyEngineEvents.SELECT_SAVEPOINT, { policyId: 'pid', savepointId: 'sp', owner: OWNER }]);
    });

    it('createSavepoint forwards CREATE_SAVEPOINT', async () => {
        const { pe, calls } = makeEngine();
        const props = { name: 'n', savepointPath: ['a'] };
        await pe.createSavepoint('pid', OWNER, props);
        assert.deepEqual(calls[0], [PolicyEngineEvents.CREATE_SAVEPOINT, { policyId: 'pid', owner: OWNER, savepointProps: props }]);
    });

    it('updateSavepoint forwards UPDATE_SAVEPOINT with name', async () => {
        const { pe, calls } = makeEngine();
        await pe.updateSavepoint('pid', 'sp', OWNER, 'new-name');
        assert.deepEqual(calls[0], [PolicyEngineEvents.UPDATE_SAVEPOINT, { policyId: 'pid', savepointId: 'sp', owner: OWNER, name: 'new-name' }]);
    });

    it('deleteSavepoints forwards DELETE_SAVEPOINTS', async () => {
        const { pe, calls } = makeEngine();
        await pe.deleteSavepoints('pid', OWNER, ['s1', 's2'], true);
        assert.deepEqual(calls[0], [PolicyEngineEvents.DELETE_SAVEPOINTS, { policyId: 'pid', owner: OWNER, savepointIds: ['s1', 's2'], skipCurrentSavepointGuard: true }]);
    });
});

describe('PolicyEngine mock data', () => {
    it('getVirtualDocuments forwards GET_VIRTUAL_DOCUMENTS with paging', async () => {
        const { pe, calls } = makeEngine();
        await pe.getVirtualDocuments('pid', 'VC', OWNER, 1, 20);
        assert.deepEqual(calls[0], [PolicyEngineEvents.GET_VIRTUAL_DOCUMENTS, { policyId: 'pid', type: 'VC', owner: OWNER, pageIndex: 1, pageSize: 20 }]);
    });

    it('getVirtualDocuments leaves paging undefined when omitted', async () => {
        const { pe, calls } = makeEngine();
        await pe.getVirtualDocuments('pid', 'VC', OWNER);
        assert.deepEqual(calls[0], [PolicyEngineEvents.GET_VIRTUAL_DOCUMENTS, { policyId: 'pid', type: 'VC', owner: OWNER, pageIndex: undefined, pageSize: undefined }]);
    });

    it('getMockConfig forwards GET_MOCK_CONFIG', async () => {
        const { pe, calls } = makeEngine();
        await pe.getMockConfig('pid', OWNER);
        assert.deepEqual(calls[0], [PolicyEngineEvents.GET_MOCK_CONFIG, { policyId: 'pid', owner: OWNER }]);
    });

    it('getMockData forwards GET_MOCK_DATA', async () => {
        const { pe, calls } = makeEngine();
        await pe.getMockData('pid', OWNER);
        assert.deepEqual(calls[0], [PolicyEngineEvents.GET_MOCK_DATA, { policyId: 'pid', owner: OWNER }]);
    });

    it('setMockConfig forwards SET_MOCK_CONFIG', async () => {
        const { pe, calls } = makeEngine();
        await pe.setMockConfig('pid', OWNER, { c: 1 });
        assert.deepEqual(calls[0], [PolicyEngineEvents.SET_MOCK_CONFIG, { policyId: 'pid', owner: OWNER, config: { c: 1 } }]);
    });

    it('updateMockData forwards SET_MOCK_DATA', async () => {
        const { pe, calls } = makeEngine();
        await pe.updateMockData('pid', OWNER, { d: 1 });
        assert.deepEqual(calls[0], [PolicyEngineEvents.SET_MOCK_DATA, { policyId: 'pid', owner: OWNER, data: { d: 1 } }]);
    });

    it('importMock forwards IMPORT_MOCK_DATA with zip first', async () => {
        const { pe, calls } = makeEngine();
        await pe.importMock('pid', OWNER, { z: 1 });
        assert.deepEqual(calls[0], [PolicyEngineEvents.IMPORT_MOCK_DATA, { zip: { z: 1 }, policyId: 'pid', owner: OWNER }]);
    });

    it('exportMock base64-decodes the response', async () => {
        const b64 = Buffer.from('mock').toString('base64');
        const { pe, calls } = makeEngine(b64);
        const buf = await pe.exportMock('pid', OWNER);
        assert.equal(buf.toString(), 'mock');
        assert.deepEqual(calls[0], [PolicyEngineEvents.EXPORT_MOCK_DATA, { policyId: 'pid', owner: OWNER }]);
    });

    it('mockRequest forwards MOCK_REQUEST', async () => {
        const { pe, calls } = makeEngine();
        await pe.mockRequest('pid', OWNER, 'TYPE', { c: 1 });
        assert.deepEqual(calls[0], [PolicyEngineEvents.MOCK_REQUEST, { policyId: 'pid', owner: OWNER, type: 'TYPE', config: { c: 1 } }]);
    });
});

describe('PolicyEngine policy tests', () => {
    it('addPolicyTest forwards ADD_POLICY_TEST', async () => {
        const { pe, calls } = makeEngine();
        await pe.addPolicyTest('pid', { f: 1 }, OWNER);
        assert.deepEqual(calls[0], [PolicyEngineEvents.ADD_POLICY_TEST, { policyId: 'pid', file: { f: 1 }, owner: OWNER }]);
    });

    it('getPolicyTest forwards GET_POLICY_TEST', async () => {
        const { pe, calls } = makeEngine();
        await pe.getPolicyTest('pid', 'tid', OWNER);
        assert.deepEqual(calls[0], [PolicyEngineEvents.GET_POLICY_TEST, { policyId: 'pid', testId: 'tid', owner: OWNER }]);
    });

    it('startPolicyTest forwards START_POLICY_TEST', async () => {
        const { pe, calls } = makeEngine();
        await pe.startPolicyTest('pid', 'tid', OWNER);
        assert.deepEqual(calls[0], [PolicyEngineEvents.START_POLICY_TEST, { policyId: 'pid', testId: 'tid', owner: OWNER }]);
    });

    it('stopPolicyTest forwards STOP_POLICY_TEST', async () => {
        const { pe, calls } = makeEngine();
        await pe.stopPolicyTest('pid', 'tid', OWNER);
        assert.deepEqual(calls[0], [PolicyEngineEvents.STOP_POLICY_TEST, { policyId: 'pid', testId: 'tid', owner: OWNER }]);
    });

    it('deletePolicyTest forwards DELETE_POLICY_TEST', async () => {
        const { pe, calls } = makeEngine();
        await pe.deletePolicyTest('pid', 'tid', OWNER);
        assert.deepEqual(calls[0], [PolicyEngineEvents.DELETE_POLICY_TEST, { policyId: 'pid', testId: 'tid', owner: OWNER }]);
    });

    it('getTestDetails forwards GET_POLICY_TEST_DETAILS', async () => {
        const { pe, calls } = makeEngine();
        await pe.getTestDetails('pid', 'tid', OWNER);
        assert.deepEqual(calls[0], [PolicyEngineEvents.GET_POLICY_TEST_DETAILS, { policyId: 'pid', testId: 'tid', owner: OWNER }]);
    });
});

describe('PolicyEngine documents', () => {
    it('getDocuments forwards GET_POLICY_DOCUMENTS with defaults', async () => {
        const { pe, calls } = makeEngine();
        await pe.getDocuments(OWNER, 'pid');
        assert.deepEqual(calls[0], [PolicyEngineEvents.GET_POLICY_DOCUMENTS, {
            owner: OWNER, policyId: 'pid', includeDocument: false, type: undefined, pageIndex: undefined, pageSize: undefined
        }]);
    });

    it('getDocuments forwards explicit args', async () => {
        const { pe, calls } = makeEngine();
        await pe.getDocuments(OWNER, 'pid', true, 'VC', 2, 50);
        assert.deepEqual(calls[0], [PolicyEngineEvents.GET_POLICY_DOCUMENTS, {
            owner: OWNER, policyId: 'pid', includeDocument: true, type: 'VC', pageIndex: 2, pageSize: 50
        }]);
    });

    it('searchDocuments forwards SEARCH_POLICY_DOCUMENTS', async () => {
        const { pe, calls } = makeEngine();
        await pe.searchDocuments(OWNER, 'pid', 'txt', ['s'], ['o'], ['t'], ['r'], 1, 10);
        assert.deepEqual(calls[0], [PolicyEngineEvents.SEARCH_POLICY_DOCUMENTS, {
            owner: OWNER, policyId: 'pid', textSearch: 'txt', schemas: ['s'], owners: ['o'], tokens: ['t'], related: ['r'], pageIndex: 1, pageSize: 10
        }]);
    });

    it('exportDocuments base64-decodes the response', async () => {
        const b64 = Buffer.from('docs').toString('base64');
        const { pe, calls } = makeEngine(b64);
        const buf = await pe.exportDocuments(OWNER, 'pid', ['id1'], 'txt', ['s'], ['o'], ['t'], ['r']);
        assert.equal(buf.toString(), 'docs');
        assert.deepEqual(calls[0], [PolicyEngineEvents.EXPORT_POLICY_DOCUMENTS, {
            owner: OWNER, policyId: 'pid', ids: ['id1'], textSearch: 'txt', schemas: ['s'], owners: ['o'], tokens: ['t'], related: ['r']
        }]);
    });

    it('getDocumentOwners forwards GET_POLICY_OWNERS', async () => {
        const { pe, calls } = makeEngine();
        await pe.getDocumentOwners(OWNER, 'pid');
        assert.deepEqual(calls[0], [PolicyEngineEvents.GET_POLICY_OWNERS, { owner: OWNER, policyId: 'pid' }]);
    });

    it('getTokens forwards GET_POLICY_TOKENS', async () => {
        const { pe, calls } = makeEngine();
        await pe.getTokens(OWNER, 'pid');
        assert.deepEqual(calls[0], [PolicyEngineEvents.GET_POLICY_TOKENS, { owner: OWNER, policyId: 'pid' }]);
    });
});
