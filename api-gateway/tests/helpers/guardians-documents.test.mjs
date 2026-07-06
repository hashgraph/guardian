import assert from 'node:assert/strict';
import { MessageAPI } from '@guardian/interfaces';
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
const user = { id: 'u1', did: 'did:u' };

describe('Guardians documents and ipfs', () => {
    it('getVcDocuments forwards user and params', async () => {
        const { g, calls } = make();
        await g.getVcDocuments(user, { type: 'X' });
        assert.deepEqual(calls[0], [MessageAPI.GET_VC_DOCUMENTS, { user, params: { type: 'X' } }]);
    });

    it('getVpDocuments forwards user and params', async () => {
        const { g, calls } = make();
        await g.getVpDocuments(user, { owner: 'o' });
        assert.deepEqual(calls[0], [MessageAPI.GET_VP_DOCUMENTS, { user, params: { owner: 'o' } }]);
    });

    it('getVpDocuments without params sends undefined', async () => {
        const { g, calls } = make();
        await g.getVpDocuments(user);
        assert.equal(calls[0][1].params, undefined);
    });

    it('getChain forwards user and id', async () => {
        const { g, calls } = make();
        await g.getChain(user, 'hash-1');
        assert.deepEqual(calls[0], [MessageAPI.GET_CHAIN, { user, id: 'hash-1' }]);
    });

    it('uploadArtifact forwards owner artifact parentId', async () => {
        const { g, calls } = make();
        await g.uploadArtifact({ a: 1 }, owner, 'p1');
        assert.deepEqual(calls[0], [MessageAPI.UPLOAD_ARTIFACT, { owner, artifact: { a: 1 }, parentId: 'p1' }]);
    });

    it('getArtifacts forwards user and options', async () => {
        const { g, calls } = make();
        await g.getArtifacts(user, { f: 1 });
        assert.deepEqual(calls[0], [MessageAPI.GET_ARTIFACTS, { user, options: { f: 1 } }]);
    });

    it('getArtifactsV2 forwards user and options', async () => {
        const { g, calls } = make();
        await g.getArtifactsV2(user, { f: 1 });
        assert.deepEqual(calls[0], [MessageAPI.GET_ARTIFACTS_V2, { user, options: { f: 1 } }]);
    });

    it('deleteArtifact forwards owner and artifactId', async () => {
        const { g, calls } = make();
        await g.deleteArtifact('a1', owner);
        assert.deepEqual(calls[0], [MessageAPI.DELETE_ARTIFACT, { owner, artifactId: 'a1' }]);
    });

    it('addFileIpfs forwards user and buffer', async () => {
        const { g, calls } = make();
        await g.addFileIpfs(user, 'data');
        assert.deepEqual(calls[0], [MessageAPI.IPFS_ADD_FILE, { user, buffer: 'data' }]);
    });

    it('addFileIpfsDirect forwards user and buffer', async () => {
        const { g, calls } = make();
        await g.addFileIpfsDirect(user, 'data');
        assert.deepEqual(calls[0], [MessageAPI.IPFS_ADD_FILE_DIRECT, { user, buffer: 'data' }]);
    });

    it('deleteIpfsCid forwards user and cid', async () => {
        const { g, calls } = make();
        await g.deleteIpfsCid(user, 'cid-1');
        assert.deepEqual(calls[0], [MessageAPI.IPFS_DELETE_CID, { user, cid: 'cid-1' }]);
    });

    it('addFileToDryRunStorage forwards user buffer policyId', async () => {
        const { g, calls } = make();
        await g.addFileToDryRunStorage(user, 'data', 'p1');
        assert.deepEqual(calls[0], [MessageAPI.ADD_FILE_DRY_RUN_STORAGE, { user, buffer: 'data', policyId: 'p1' }]);
    });

    it('getFileIpfs forwards responseType', async () => {
        const { g, calls } = make();
        await g.getFileIpfs(user, 'cid-1', 'json');
        assert.deepEqual(calls[0], [MessageAPI.IPFS_GET_FILE, { user, cid: 'cid-1', responseType: 'json' }]);
    });

    it('getFileFromDryRunStorage forwards args', async () => {
        const { g, calls } = make();
        await g.getFileFromDryRunStorage(user, 'cid-1', 'raw');
        assert.deepEqual(calls[0], [MessageAPI.GET_FILE_DRY_RUN_STORAGE, { user, cid: 'cid-1', responseType: 'raw' }]);
    });

    it('compareDocuments forwards full level set with type moved into payload', async () => {
        const { g, calls } = make();
        await g.compareDocuments(user, 'doc', ['i1'], 1, 2, 3, 4, 5, 6);
        assert.deepEqual(calls[0], [MessageAPI.COMPARE_DOCUMENTS, {
            type: 'doc', user, ids: ['i1'], eventsLvl: 1, propLvl: 2, childrenLvl: 3, idLvl: 4, keyLvl: 5, refLvl: 6
        }]);
    });

    it('compareVPDocuments forwards full level set', async () => {
        const { g, calls } = make();
        await g.compareVPDocuments(user, 'doc', ['i1'], 1, 2, 3, 4, 5, 6);
        assert.deepEqual(calls[0], [MessageAPI.COMPARE_VP_DOCUMENTS, {
            type: 'doc', user, ids: ['i1'], eventsLvl: 1, propLvl: 2, childrenLvl: 3, idLvl: 4, keyLvl: 5, refLvl: 6
        }]);
    });

    it('compareTools forwards levels without key/ref', async () => {
        const { g, calls } = make();
        await g.compareTools(user, 'tool', ['i1'], 1, 2, 3, 4);
        assert.deepEqual(calls[0], [MessageAPI.COMPARE_TOOLS, {
            type: 'tool', user, ids: ['i1'], eventsLvl: 1, propLvl: 2, childrenLvl: 3, idLvl: 4
        }]);
    });

    it('comparePolicies nests options object', async () => {
        const { g, calls } = make();
        const policies = [{ type: 'id', value: 'p1' }];
        await g.comparePolicies(owner, 'pol', policies, 1, 2, 3, 4);
        assert.deepEqual(calls[0], [MessageAPI.COMPARE_POLICIES, {
            user: owner, type: 'pol', policies, options: { propLvl: 2, childrenLvl: 3, eventsLvl: 1, idLvl: 4 }
        }]);
    });

    it('compareOriginalPolicies nests options object', async () => {
        const { g, calls } = make();
        await g.compareOriginalPolicies(owner, 'pol', 'pid-1', 1, 2, 3, 4);
        assert.deepEqual(calls[0], [MessageAPI.COMPARE_ORIGINAL_POLICIES, {
            user: owner, type: 'pol', policyId: 'pid-1', options: { propLvl: 2, childrenLvl: 3, eventsLvl: 1, idLvl: 4 }
        }]);
    });

    it('compareModules forwards both module ids', async () => {
        const { g, calls } = make();
        await g.compareModules(user, 'mod', 'm1', 'm2', 1, 2, 3, 4);
        assert.deepEqual(calls[0], [MessageAPI.COMPARE_MODULES, {
            type: 'mod', user, moduleId1: 'm1', moduleId2: 'm2', eventsLvl: 1, propLvl: 2, childrenLvl: 3, idLvl: 4
        }]);
    });

    it('compareSchemas forwards schemas and idLvl', async () => {
        const { g, calls } = make();
        const schemas = [{ type: 'id', value: 's1' }];
        await g.compareSchemas(owner, 'sch', schemas, 4);
        assert.deepEqual(calls[0], [MessageAPI.COMPARE_SCHEMAS, { user: owner, type: 'sch', schemas, idLvl: 4 }]);
    });

    it('searchPolicies forwards user and filters', async () => {
        const { g, calls } = make();
        await g.searchPolicies(owner, { text: 'a' });
        assert.deepEqual(calls[0], [MessageAPI.SEARCH_POLICIES, { user: owner, filters: { text: 'a' } }]);
    });

    it('getProfile forwards user', async () => {
        const { g, calls } = make();
        await g.getProfile(user);
        assert.deepEqual(calls[0], [MessageAPI.GET_USER_PROFILE, { user }]);
    });

    it('getKeys forwards filters and user', async () => {
        const { g, calls } = make();
        await g.getKeys(user, { pageIndex: 0, pageSize: 5 });
        assert.deepEqual(calls[0], [MessageAPI.GET_USER_KEYS, { filters: { pageIndex: 0, pageSize: 5 }, user }]);
    });

    it('generateKey forwards optional key', async () => {
        const { g, calls } = make();
        await g.generateKey(user, 'm1', 'k1');
        assert.deepEqual(calls[0], [MessageAPI.GENERATE_USER_KEYS, { user, messageId: 'm1', key: 'k1' }]);
    });

    it('generateKey without key sends undefined', async () => {
        const { g, calls } = make();
        await g.generateKey(user, 'm1');
        assert.equal(calls[0][1].key, undefined);
    });

    it('deleteKey forwards user and id', async () => {
        const { g, calls } = make();
        await g.deleteKey(user, 'id-1');
        assert.deepEqual(calls[0], [MessageAPI.DELETE_USER_KEYS, { user, id: 'id-1' }]);
    });

    it('csvGetFile forwards user and fileId', async () => {
        const { g, calls } = make();
        await g.csvGetFile('f1', user);
        assert.deepEqual(calls[0], [MessageAPI.GET_FILE, { user, fileId: 'f1' }]);
    });

    it('upsertFile spreads payload alongside user', async () => {
        const { g, calls } = make();
        const payload = { file: { buffer: Buffer.from('x') }, fileId: 'f1' };
        await g.upsertFile(payload, user);
        assert.deepEqual(calls[0], [MessageAPI.UPSERT_FILE, { user, file: payload.file, fileId: 'f1' }]);
    });

    it('deleteGridFile forwards user and fileId', async () => {
        const { g, calls } = make();
        await g.deleteGridFile(user, 'f1');
        assert.deepEqual(calls[0], [MessageAPI.DELETE_FILE, { user, fileId: 'f1' }]);
    });

    it('getRelayerAccountRelationships forwards args', async () => {
        const { g, calls } = make();
        await g.getRelayerAccountRelationships('0.0.5', user, { pageIndex: 1, pageSize: 10 });
        assert.deepEqual(calls[0], [MessageAPI.GET_RELAYER_ACCOUNT_RELATIONSHIPS, { relayerAccountId: '0.0.5', user, filters: { pageIndex: 1, pageSize: 10 } }]);
    });

    it('setCredential builds payload from body with dryRun coerced', async () => {
        const { g, calls } = make();
        await g.setCredential(user, 'p1', { serviceType: 'svc', dryRun: 1, fields: { a: 1 } });
        assert.deepEqual(calls[0], [MessageAPI.SET_CREDENTIAL, { user, policyId: 'p1', serviceType: 'svc', dryRun: true, fields: { a: 1 } }]);
    });

    it('setCredential coerces falsy dryRun to false', async () => {
        const { g, calls } = make();
        await g.setCredential(user, null, { serviceType: 'svc', fields: {} });
        assert.equal(calls[0][1].dryRun, false);
        assert.equal(calls[0][1].policyId, null);
    });

    it('getCredentials forwards optional ownerId', async () => {
        const { g, calls } = make();
        await g.getCredentials(user, 'p1', 'own-1');
        assert.deepEqual(calls[0], [MessageAPI.GET_CREDENTIALS, { user, policyId: 'p1', ownerId: 'own-1' }]);
    });

    it('deleteCredential defaults dryRun false', async () => {
        const { g, calls } = make();
        await g.deleteCredential(user, 'p1', 'svc');
        assert.deepEqual(calls[0], [MessageAPI.DELETE_CREDENTIAL, { user, policyId: 'p1', serviceType: 'svc', dryRun: false }]);
    });

    it('deleteCredential honors dryRun true', async () => {
        const { g, calls } = make();
        await g.deleteCredential(user, 'p1', 'svc', true);
        assert.equal(calls[0][1].dryRun, true);
    });
});
