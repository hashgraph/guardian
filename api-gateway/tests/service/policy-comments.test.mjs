import assert from 'node:assert/strict';
import {
    makeUser, makeRes, makeReq, makeCacheService, makeLogger,
    internalExceptionRethrow, loadController, guardiansInterfaces
} from './_controller-harness.mjs';

const DIST = '../../dist/api/service/policy-comments.js';

let stub;

class FakePolicyEngine {
    constructor(tc) { this.tc = tc; }
    getPolicyUsers(...a) { return stub.getPolicyUsers(...a); }
    getDocumentRelationships(...a) { return stub.getDocumentRelationships(...a); }
    getDocumentSchemas(...a) { return stub.getDocumentSchemas(...a); }
    getPolicyDiscussions(...a) { return stub.getPolicyDiscussions(...a); }
    createPolicyDiscussion(...a) { return stub.createPolicyDiscussion(...a); }
    createPolicyComment(...a) { return stub.createPolicyComment(...a); }
    getPolicyComments(...a) { return stub.getPolicyComments(...a); }
    getPolicyCommentsCount(...a) { return stub.getPolicyCommentsCount(...a); }
    addFileIpfs(...a) { return stub.addFileIpfs(...a); }
    getFileIpfs(...a) { return stub.getFileIpfs(...a); }
    getDiscussionKey(...a) { return stub.getDiscussionKey(...a); }
}

async function load() {
    return loadController(DIST, {
        '#helpers': {
            CacheService: class {}, getCacheKey: (t) => `k:${t.join('|')}`,
            InternalException: internalExceptionRethrow, PolicyEngine: FakePolicyEngine,
            UseCache: () => () => undefined
        },
        '#auth': { Auth: () => () => undefined, AuthUser: () => () => undefined },
        '#constants': { PREFIXES: { POLICY_COMMENTS: 'policy-comments/' } },
        '#middlewares': new Proxy({}, { get: () => class {} }),
        '@guardian/common': { PinoLogger: class {} },
        '@guardian/interfaces': guardiansInterfaces
    });
}

function makeApi(Api) { const cache = makeCacheService(); return { api: new Api(cache, makeLogger()), cache }; }

describe('PolicyCommentsApi controller logic', function () {
    this.timeout(60000);
    let Api;
    before(async () => { ({ PolicyCommentsApi: Api } = await load()); });

    beforeEach(() => {
        stub = {
            getPolicyUsers: async () => [{ u: 1 }],
            getDocumentRelationships: async () => ({ rel: true }),
            getDocumentSchemas: async () => ([{ s: 1 }]),
            getPolicyDiscussions: async () => ([{ d: 1 }]),
            createPolicyDiscussion: async () => ({ created: true }),
            createPolicyComment: async () => ({ comment: true }),
            getPolicyComments: async () => ({ comments: [{ c: 1 }], count: 5 }),
            getPolicyCommentsCount: async () => ({ count: 3 }),
            addFileIpfs: async () => ({ cid: 'CID1' }),
            getFileIpfs: async () => ({ type: 'Buffer', data: [1, 2, 3] }),
            getDiscussionKey: async () => ({ type: 'Buffer', data: [4, 5] })
        };
    });

    it('getUsers throws 422 without policyId', async () => {
        await assert.rejects(makeApi(Api).api.getUsers(makeUser(), '', 'doc1'), (e) => { assert.equal(e.getStatus(), 422); return true; });
    });

    it('getUsers delegates to engine', async () => {
        const out = await makeApi(Api).api.getUsers(makeUser(), 'pol1', 'doc1');
        assert.deepEqual(out, [{ u: 1 }]);
    });

    it('getRelationships throws 422 without policyId', async () => {
        await assert.rejects(makeApi(Api).api.getRelationships(makeUser(), '', 'doc1'), (e) => { assert.equal(e.getStatus(), 422); return true; });
    });

    it('getRelationships delegates', async () => {
        assert.deepEqual(await makeApi(Api).api.getRelationships(makeUser(), 'pol1', 'doc1'), { rel: true });
    });

    it('getSchemas throws 422 without policyId', async () => {
        await assert.rejects(makeApi(Api).api.getSchemas(makeUser(), '', 'doc1'), (e) => { assert.equal(e.getStatus(), 422); return true; });
    });

    it('getSchemas delegates', async () => {
        assert.deepEqual(await makeApi(Api).api.getSchemas(makeUser(), 'pol1', 'doc1'), [{ s: 1 }]);
    });

    it('getDiscussions throws 422 without policyId', async () => {
        await assert.rejects(makeApi(Api).api.getDiscussions(makeUser(), '', 'doc1', 's', 'f', false), (e) => { assert.equal(e.getStatus(), 422); return true; });
    });

    it('getDiscussions passes search/field/audit params', async () => {
        let seen;
        stub.getPolicyDiscussions = async (user, pol, doc, params) => { seen = params; return []; };
        await makeApi(Api).api.getDiscussions(makeUser(), 'pol1', 'doc1', 'srch', 'fld', false);
        assert.equal(seen.search, 'srch');
        assert.equal(seen.field, 'fld');
        assert.equal(seen.audit, false);
    });

    it('getDiscussions sets audit true when readonly+audit permission', async () => {
        let seen;
        stub.getPolicyDiscussions = async (user, pol, doc, params) => { seen = params; return []; };
        const user = makeUser({ permissions: ['POLICIES_POLICY_AUDIT'] });
        await makeApi(Api).api.getDiscussions(user, 'pol1', 'doc1', '', '', true);
        assert.equal(seen.audit, true);
    });

    it('createDiscussion delegates', async () => {
        assert.deepEqual(await makeApi(Api).api.createDiscussion(makeUser(), 'pol1', 'doc1', { t: 1 }), { created: true });
    });

    it('createDiscussion maps error to 422', async () => {
        stub.createPolicyDiscussion = async () => { throw new Error('bad'); };
        await assert.rejects(makeApi(Api).api.createDiscussion(makeUser(), 'pol1', 'doc1', {}), (e) => { assert.equal(e.getStatus(), 422); return true; });
    });

    it('createPolicyComment delegates with discussionId', async () => {
        let seen;
        stub.createPolicyComment = async (user, pol, doc, discId) => { seen = discId; return { comment: true }; };
        await makeApi(Api).api.createPolicyComment(makeUser(), 'pol1', 'doc1', 'disc1', {});
        assert.equal(seen, 'disc1');
    });

    it('createPolicyComment maps error to 422', async () => {
        stub.createPolicyComment = async () => { throw new Error('bad'); };
        await assert.rejects(makeApi(Api).api.createPolicyComment(makeUser(), 'pol1', 'doc1', 'disc1', {}), (e) => { assert.equal(e.getStatus(), 422); return true; });
    });

    it('getPolicyComments sets count header and sends comments', async () => {
        const res = makeRes();
        const out = await makeApi(Api).api.getPolicyComments(makeUser(), 'pol1', 'doc1', 'disc1', {}, res, false);
        assert.equal(res.headers['X-Total-Count'], 5);
        assert.deepEqual(out.payload, [{ c: 1 }]);
    });

    it('getPolicyComments merges audit flag into body', async () => {
        let seen;
        stub.getPolicyComments = async (user, pol, doc, disc, body) => { seen = body; return { comments: [], count: 0 }; };
        const user = makeUser({ permissions: ['POLICIES_POLICY_AUDIT'] });
        await makeApi(Api).api.getPolicyComments(user, 'pol1', 'doc1', 'disc1', { page: 1 }, makeRes(), true);
        assert.equal(seen.audit, true);
        assert.equal(seen.page, 1);
    });

    it('getPolicyCommentsCount delegates', async () => {
        assert.deepEqual(await makeApi(Api).api.getPolicyCommentsCount(makeUser(), 'pol1', 'doc1'), { count: 3 });
    });

    it('getPolicyCommentsCount maps error to 422', async () => {
        stub.getPolicyCommentsCount = async () => { throw new Error('bad'); };
        await assert.rejects(makeApi(Api).api.getPolicyCommentsCount(makeUser(), 'pol1', 'doc1'), (e) => { assert.equal(e.getStatus(), 422); return true; });
    });

    it('postFile throws 422 when body empty', async () => {
        await assert.rejects(makeApi(Api).api.postFile({}, makeUser(), 'pol1', 'doc1', 'disc1', makeReq()), (e) => { assert.equal(e.getStatus(), 422); return true; });
    });

    it('postFile throws 400 when cid missing', async () => {
        stub.addFileIpfs = async () => ({ cid: null });
        await assert.rejects(makeApi(Api).api.postFile({ file: 1 }, makeUser(), 'pol1', 'doc1', 'disc1', makeReq()), (e) => { assert.equal(e.getStatus(), 400); return true; });
    });

    it('postFile returns JSON cid and invalidates cache', async () => {
        const { api, cache } = makeApi(Api);
        const out = await api.postFile({ file: 1 }, makeUser(), 'pol1', 'doc1', 'disc1', makeReq());
        assert.equal(out, JSON.stringify('CID1'));
        assert.equal(cache.calls.invalidate.length, 1);
    });

    it('getFile throws 404 when result is not Buffer', async () => {
        stub.getFileIpfs = async () => ({ type: 'other' });
        await assert.rejects(makeApi(Api).api.getFile(makeUser(), 'pol1', 'doc1', 'disc1', 'cid'), (e) => { assert.equal(e.getStatus(), 404); return true; });
    });

    it('getFile returns a StreamableFile when Buffer', async () => {
        const out = await makeApi(Api).api.getFile(makeUser(), 'pol1', 'doc1', 'disc1', 'cid');
        assert.ok(out);
        assert.equal(out.constructor.name, 'StreamableFile');
    });

    it('getKey throws 404 when result is not Buffer', async () => {
        stub.getDiscussionKey = async () => ({ type: 'other' });
        await assert.rejects(makeApi(Api).api.getKey(makeUser(), 'pol1', 'doc1', 'disc1'), (e) => { assert.equal(e.getStatus(), 404); return true; });
    });

    it('getKey returns a StreamableFile when Buffer', async () => {
        const out = await makeApi(Api).api.getKey(makeUser(), 'pol1', 'doc1', 'disc1');
        assert.equal(out.constructor.name, 'StreamableFile');
    });
});
