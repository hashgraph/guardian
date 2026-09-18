import assert from 'node:assert/strict';
import esmock from 'esmock';

const TAGS_DIST = '../../dist/api/service/tags.js';
const authMock = { Auth: () => () => undefined, AuthUser: () => () => undefined };
const middlewaresMock = new Proxy({}, { get: (t, p) => (p === 'Examples' || p === 'ObjectExamples') ? new Proxy({}, { get: () => 'ex' }) : (p === 'pageHeader' ? {} : class {}) });

function makeUser(extra = {}) {
    return { id: 'user-1', did: 'did:u', role: 'STANDARD_REGISTRY', permissions: [], tenantContext: { tenantId: 't1' }, ...extra };
}
function makeReq(extra = {}) { return { url: '/tags', user: makeUser(), params: {}, ...extra }; }
function makeRes() {
    const calls = {};
    const res = { header: (k, v) => { calls.header = { k, v }; return { send: (b) => { calls.sent = b; return calls; } }; } };
    return { res, calls };
}

describe('TagsApi', function () {
    this.timeout(60000);
    let TagsApi;
    let guardiansImpl;
    let invalidated;
    let runRan;

    before(async () => {
        ({ TagsApi } = await esmock(TAGS_DIST, {
            '@guardian/common': { PinoLogger: class {}, RunFunctionAsync: (fn) => { runRan = true; fn(); } },
            '@guardian/interfaces': {
                Permissions: { POLICIES_POLICY_TAG: 'POLICIES_POLICY_TAG' },
                SchemaCategory: { TAG: 'TAG' },
                SchemaHelper: { updateOwner: () => undefined, checkSchemaKey: () => undefined },
                TagType: { PolicyBlock: 'PolicyBlock' },
                TaskAction: { DELETE_SCHEMAS: 'DELETE_SCHEMAS' },
                UserRole: { USER: 'USER' },
            },
            '#middlewares': middlewaresMock,
            '#auth': authMock,
            '#helpers': {
                ONLY_SR: '',
                SchemaUtils: {
                    toOld: (x) => x,
                    fromOld: () => undefined,
                    clearIds: () => undefined,
                    checkPermission: (...a) => guardiansImpl.checkPermission ? guardiansImpl.checkPermission(...a) : null,
                },
                Guardians: class {
                    constructor(tc) { this.tc = tc; }
                    async createTag(...a) { return guardiansImpl.createTag(...a); }
                    async getTags(...a) { return guardiansImpl.getTags(...a); }
                    async getTagCache(...a) { return guardiansImpl.getTagCache(...a); }
                    async deleteTag(...a) { return guardiansImpl.deleteTag(...a); }
                    async synchronizationTags(...a) { return guardiansImpl.synchronizationTags(...a); }
                    async getTagSchemas(...a) { return guardiansImpl.getTagSchemas(...a); }
                    async getTagSchemasV2(...a) { return guardiansImpl.getTagSchemasV2(...a); }
                    async createTagSchema(...a) { return guardiansImpl.createTagSchema(...a); }
                    async getSchemaById(...a) { return guardiansImpl.getSchemaById(...a); }
                    async deleteSchema(...a) { return guardiansImpl.deleteSchema(...a); }
                    async updateSchema(...a) { return guardiansImpl.updateSchema(...a); }
                    async publishTagSchema(...a) { return guardiansImpl.publishTagSchema(...a); }
                    async getPublishedTagSchemas(...a) { return guardiansImpl.getPublishedTagSchemas(...a); }
                },
                InternalException: async (e) => { throw e; },
                EntityOwner: class { constructor(user) { this.creator = user?.did; } },
                CacheService: class {},
                getCacheKey: (keys) => `ck:${keys.join('|')}`,
                UseCache: () => () => undefined,
                TaskManager: class { start(action, id) { return { taskId: 't1', action, id }; } addError() {} },
            },
            '#constants': { PREFIXES: { TAGS: 'tags/', SCHEMES: 'schemes/' }, SCHEMA_REQUIRED_PROPS: { a: 'a' } },
        }));
    });

    function makeApi() {
        invalidated = [];
        runRan = false;
        const cacheService = { invalidate: async (k) => { invalidated.push(k); } };
        return new TagsApi(cacheService, { error: () => undefined });
    }

    it('setTags creates a tag and invalidates the schemas cache', async () => {
        let seen;
        guardiansImpl = { createTag: async (body, owner) => { seen = { body, owner }; return { id: 'tag1' }; } };
        const out = await makeApi().setTags(makeUser(), { entity: 'Other', name: 'x' }, makeReq());
        assert.deepEqual(out, { id: 'tag1' });
        assert.equal(invalidated.length, 1);
        assert.deepEqual(seen.body, { entity: 'Other', name: 'x' });
    });

    it('setTags forbids a plain USER without POLICIES_POLICY_TAG on a PolicyBlock tag', async () => {
        guardiansImpl = { createTag: async () => ({}) };
        await assert.rejects(
            makeApi().setTags(makeUser({ role: 'USER', permissions: [] }), { entity: 'PolicyBlock' }, makeReq()),
            (e) => { assert.equal(e.getStatus(), 403); return true; }
        );
    });

    it('setTags allows a USER that holds POLICIES_POLICY_TAG', async () => {
        guardiansImpl = { createTag: async () => ({ id: 'ok' }) };
        const out = await makeApi().setTags(
            makeUser({ role: 'USER', permissions: ['POLICIES_POLICY_TAG'] }),
            { entity: 'PolicyBlock' },
            makeReq()
        );
        assert.deepEqual(out, { id: 'ok' });
    });

    it('searchTags throws 422 when entity is missing', async () => {
        guardiansImpl = {};
        await assert.rejects(makeApi().searchTags(makeUser(), { target: 'x' }, makeReq()), (e) => { assert.equal(e.getStatus(), 422); return true; });
    });

    it('searchTags throws 422 when neither target nor targets are valid', async () => {
        guardiansImpl = {};
        await assert.rejects(makeApi().searchTags(makeUser(), { entity: 'E' }, makeReq()), (e) => { assert.equal(e.getStatus(), 422); return true; });
    });

    it('searchTags throws 422 when target is not a string', async () => {
        guardiansImpl = {};
        await assert.rejects(makeApi().searchTags(makeUser(), { entity: 'E', target: 123 }, makeReq()), (e) => { assert.equal(e.getStatus(), 422); return true; });
    });

    it('searchTags groups tags by localTarget and attaches refresh dates', async () => {
        guardiansImpl = {
            getTags: async () => [
                { localTarget: 'A', name: 't1' },
                { localTarget: 'A', name: 't2' },
                { localTarget: 'B', name: 't3' },
            ],
            getTagCache: async () => [{ localTarget: 'A', date: '2020' }],
        };
        const out = await makeApi().searchTags(makeUser(), { entity: 'E', target: 'A' }, makeReq());
        assert.equal(out.A.tags.length, 2);
        assert.equal(out.A.refreshDate, '2020');
        assert.equal(out.B.tags.length, 1);
    });

    it('searchTags accepts a targets array', async () => {
        let seenTargets;
        guardiansImpl = {
            getTags: async (owner, entity, targets) => { seenTargets = targets; return []; },
            getTagCache: async () => [],
        };
        await makeApi().searchTags(makeUser(), { entity: 'E', targets: ['x', 'y'] }, makeReq());
        assert.deepEqual(seenTargets, ['x', 'y']);
    });

    it('deleteTag throws 422 when uuid is missing', async () => {
        guardiansImpl = {};
        await assert.rejects(makeApi().deleteTag(makeUser(), '', makeReq()), (e) => { assert.equal(e.getStatus(), 422); return true; });
    });

    it('deleteTag deletes and invalidates cache', async () => {
        let seen;
        guardiansImpl = { deleteTag: async (uuid, owner) => { seen = uuid; return true; } };
        const out = await makeApi().deleteTag(makeUser(), 'uuid-1', makeReq());
        assert.equal(out, true);
        assert.equal(seen, 'uuid-1');
        assert.equal(invalidated.length, 1);
    });

    it('synchronizationTags throws 422 without an entity', async () => {
        guardiansImpl = {};
        await assert.rejects(makeApi().synchronizationTags(makeUser(), { target: 'x' }, makeReq()), (e) => { assert.equal(e.getStatus(), 422); return true; });
    });

    it('synchronizationTags throws 422 when target is not a string', async () => {
        guardiansImpl = {};
        await assert.rejects(makeApi().synchronizationTags(makeUser(), { entity: 'E', target: 5 }, makeReq()), (e) => { assert.equal(e.getStatus(), 422); return true; });
    });

    it('synchronizationTags returns entity, target, tags and an ISO refresh date', async () => {
        guardiansImpl = { synchronizationTags: async () => [{ id: 't' }] };
        const out = await makeApi().synchronizationTags(makeUser(), { entity: 'E', target: 'A' }, makeReq());
        assert.equal(out.entity, 'E');
        assert.equal(out.target, 'A');
        assert.deepEqual(out.tags, [{ id: 't' }]);
        assert.match(out.refreshDate, /\d{4}-\d{2}-\d{2}T/);
    });

    it('getSchemas sets total-count header and marks readonly for foreign owners', async () => {
        guardiansImpl = { getTagSchemas: async () => ({ items: [{ owner: 'other' }, { owner: 'did:u' }], count: 2 }) };
        const { res, calls } = makeRes();
        await makeApi().getSchemas(makeUser(), makeReq(), res, 0, 20);
        assert.deepEqual(calls.header, { k: 'X-Total-Count', v: 2 });
        assert.equal(calls.sent[0].readonly, true);
        assert.equal(calls.sent[1].readonly, false);
    });

    it('getSchemasV2 sets total-count header', async () => {
        guardiansImpl = { getTagSchemasV2: async () => ({ items: [{ owner: 'did:u' }], count: 1 }) };
        const { res, calls } = makeRes();
        await makeApi().getSchemasV2(makeUser(), makeReq(), res, 0, 20);
        assert.deepEqual(calls.header, { k: 'X-Total-Count', v: 1 });
    });

    it('postSchemas throws 422 when newSchema is missing', async () => {
        guardiansImpl = {};
        await assert.rejects(makeApi().postSchemas(makeUser(), null, makeReq()), (e) => { assert.equal(e.getStatus(), 422); return true; });
    });

    it('postSchemas sets the TAG category and creates the schema', async () => {
        let created;
        guardiansImpl = { createTagSchema: async (schema) => { created = schema; return { id: 's' }; } };
        const out = await makeApi().postSchemas(makeUser(), { name: 'S' }, makeReq());
        assert.deepEqual(out, { id: 's' });
        assert.equal(created.category, 'TAG');
    });

    it('deleteSchema throws 403 when permission is denied', async () => {
        guardiansImpl = { getSchemaById: async () => ({ id: 's' }), checkPermission: () => 'no access' };
        await assert.rejects(makeApi().deleteSchema(makeUser(), 's1', makeReq()), (e) => { assert.equal(e.getStatus(), 403); return true; });
    });

    it('deleteSchema starts a delete task and returns true', async () => {
        guardiansImpl = { getSchemaById: async () => ({}), checkPermission: () => null, deleteSchema: async () => undefined };
        const out = await makeApi().deleteSchema(makeUser(), 's1', makeReq());
        assert.equal(out, true);
        assert.equal(runRan, true);
    });

    it('updateSchema throws 403 when permission is denied', async () => {
        guardiansImpl = { getSchemaById: async () => ({}), checkPermission: () => 'denied' };
        await assert.rejects(makeApi().updateSchema(makeUser(), 's1', { id: 's1' }, makeReq()), (e) => { assert.equal(e.getStatus(), 403); return true; });
    });

    it('updateSchema updates when permission is granted', async () => {
        guardiansImpl = { getSchemaById: async () => ({}), checkPermission: () => null, updateSchema: async () => ({ updated: true }) };
        const out = await makeApi().updateSchema(makeUser(), 's1', { id: 's1' }, makeReq());
        assert.deepEqual(out, { updated: true });
    });

    it('publishTag throws 403 when permission is denied', async () => {
        guardiansImpl = { getSchemaById: async () => ({}), checkPermission: () => 'denied' };
        await assert.rejects(makeApi().publishTag(makeUser(), 's1', makeReq()), (e) => { assert.equal(e.getStatus(), 403); return true; });
    });

    it('publishTag publishes with version 1.0.0', async () => {
        let seenVersion;
        guardiansImpl = { getSchemaById: async () => ({}), checkPermission: () => null, publishTagSchema: async (id, version) => { seenVersion = version; return { published: true }; } };
        const out = await makeApi().publishTag(makeUser(), 's1', makeReq());
        assert.deepEqual(out, { published: true });
        assert.equal(seenVersion, '1.0.0');
    });

    it('getPublished returns the published tag schemas', async () => {
        guardiansImpl = { getPublishedTagSchemas: async () => [{ id: 'p' }] };
        assert.deepEqual(await makeApi().getPublished(makeUser()), [{ id: 'p' }]);
    });

    it('getPublished rethrows via InternalException', async () => {
        guardiansImpl = { getPublishedTagSchemas: async () => { throw new Error('pub'); } };
        await assert.rejects(makeApi().getPublished(makeUser()), /pub/);
    });
});
