import assert from 'node:assert/strict';
import esmock from 'esmock';

const ANALYTICS_DIST = '../../dist/api/service/analytics.js';
const authMock = { Auth: () => () => undefined, AuthUser: () => () => undefined };
const middlewaresMock = new Proxy({}, { get: (t, p) => (p === 'Examples' || p === 'ObjectExamples') ? new Proxy({}, { get: () => 'ex' }) : class {} });

function makeUser(extra = {}) {
    return { id: 'user-1', did: 'did:u', tenantContext: { tenantId: 't1' }, ...extra };
}
const is422 = (e) => { assert.equal(e.getStatus(), 422); return true; };

describe('AnalyticsApi', function () {
    this.timeout(60000);
    let AnalyticsApi;
    let guardiansImpl;

    before(async () => {
        ({ AnalyticsApi } = await esmock(ANALYTICS_DIST, {
            '@guardian/interfaces': {
                EntityOwner: class { constructor(user) { this.creator = user?.did; } },
                Permissions: new Proxy({}, { get: () => 'p' }),
            },
            '#middlewares': middlewaresMock,
            '#auth': authMock,
            '@guardian/common': { PinoLogger: class {} },
            '#helpers': {
                Guardians: class {
                    constructor(tc) { this.tc = tc; }
                    async searchPolicies(...a) { return guardiansImpl.searchPolicies(...a); }
                    async comparePolicies(...a) { return guardiansImpl.comparePolicies(...a); }
                    async compareOriginalPolicies(...a) { return guardiansImpl.compareOriginalPolicies(...a); }
                    async compareModules(...a) { return guardiansImpl.compareModules(...a); }
                    async compareSchemas(...a) { return guardiansImpl.compareSchemas(...a); }
                    async compareDocuments(...a) { return guardiansImpl.compareDocuments(...a); }
                    async compareTools(...a) { return guardiansImpl.compareTools(...a); }
                    async searchBlocks(...a) { return guardiansImpl.searchBlocks(...a); }
                    async getIndexerAvailability(...a) { return guardiansImpl.getIndexerAvailability(...a); }
                },
                ONLY_SR: '',
                InternalException: async (e) => { throw e; },
            },
        }));
    });

    function makeApi() { return new AnalyticsApi({ error: () => undefined }); }

    it('searchPolicies forwards the filters to guardians', async () => {
        let seen;
        guardiansImpl = { searchPolicies: async (owner, filters) => { seen = filters; return [{ id: 'p' }]; } };
        const out = await makeApi().searchPolicies(makeUser(), { text: 'x' });
        assert.deepEqual(out, [{ id: 'p' }]);
        assert.deepEqual(seen, { text: 'x' });
    });

    it('searchPolicies rethrows via InternalException', async () => {
        guardiansImpl = { searchPolicies: async () => { throw new Error('sp'); } };
        await assert.rejects(makeApi().searchPolicies(makeUser(), {}), /sp/);
    });

    it('comparePolicies throws 422 with no filters', async () => {
        guardiansImpl = {};
        await assert.rejects(makeApi().comparePolicies(makeUser(), null), is422);
    });

    it('comparePolicies builds an id list from policyId1/policyId2', async () => {
        let seenPolicies;
        guardiansImpl = { comparePolicies: async (owner, type, policies) => { seenPolicies = policies; return { ok: true }; } };
        await makeApi().comparePolicies(makeUser(), { policyId1: 'a', policyId2: 'b' });
        assert.deepEqual(seenPolicies, [{ type: 'id', value: 'a' }, { type: 'id', value: 'b' }]);
    });

    it('comparePolicies accepts a policies array of length > 1', async () => {
        let seenPolicies;
        guardiansImpl = { comparePolicies: async (owner, type, policies) => { seenPolicies = policies; return {}; } };
        await makeApi().comparePolicies(makeUser(), { policies: ['x', 'y'] });
        assert.deepEqual(seenPolicies, ['x', 'y']);
    });

    it('comparePolicies maps a policyIds array to typed ids', async () => {
        let seenPolicies;
        guardiansImpl = { comparePolicies: async (owner, type, policies) => { seenPolicies = policies; return {}; } };
        await makeApi().comparePolicies(makeUser(), { policyIds: ['p1', 'p2'] });
        assert.deepEqual(seenPolicies, [{ type: 'id', value: 'p1' }, { type: 'id', value: 'p2' }]);
    });

    it('comparePolicies forwards comparison levels', async () => {
        let args;
        guardiansImpl = { comparePolicies: async (...a) => { args = a; return {}; } };
        await makeApi().comparePolicies(makeUser(), { policyId1: 'a', policyId2: 'b', eventsLvl: 1, propLvl: 2, childrenLvl: 3, idLvl: 4 });
        assert.deepEqual(args.slice(3), [1, 2, 3, 4]);
    });

    it('compareOriginalPolicy forwards the policyId and levels', async () => {
        let args;
        guardiansImpl = { compareOriginalPolicies: async (...a) => { args = a; return { r: 1 }; } };
        const out = await makeApi().compareOriginalPolicy(makeUser(), 'pol-1', { eventsLvl: 5 });
        assert.deepEqual(out, { r: 1 });
        assert.equal(args[2], 'pol-1');
        assert.equal(args[3], 5);
    });

    it('compareModules throws 422 when either module id is missing', async () => {
        guardiansImpl = {};
        await assert.rejects(makeApi().compareModules(makeUser(), { moduleId1: 'a' }), is422);
    });

    it('compareModules forwards both module ids', async () => {
        let args;
        guardiansImpl = { compareModules: async (...a) => { args = a; return {}; } };
        await makeApi().compareModules(makeUser(), { moduleId1: 'm1', moduleId2: 'm2' });
        assert.equal(args[2], 'm1');
        assert.equal(args[3], 'm2');
    });

    it('compareSchemas throws 422 without valid schema ids', async () => {
        guardiansImpl = {};
        await assert.rejects(makeApi().compareSchemas(makeUser(), {}), is422);
    });

    it('compareSchemas builds ids from schemaId1/schemaId2', async () => {
        let seenSchemas;
        guardiansImpl = { compareSchemas: async (owner, type, schemas) => { seenSchemas = schemas; return {}; } };
        await makeApi().compareSchemas(makeUser(), { schemaId1: 's1', schemaId2: 's2' });
        assert.deepEqual(seenSchemas, [{ type: 'id', value: 's1' }, { type: 'id', value: 's2' }]);
    });

    it('compareDocuments throws 422 without valid document ids', async () => {
        guardiansImpl = {};
        await assert.rejects(makeApi().compareDocuments(makeUser(), { documentId1: 'a' }), is422);
    });

    it('compareDocuments forwards a two-element id list with keyLvl/refLvl of 0', async () => {
        let args;
        guardiansImpl = { compareDocuments: async (...a) => { args = a; return {}; } };
        await makeApi().compareDocuments(makeUser(), { documentId1: 'a', documentId2: 'b' });
        assert.deepEqual(args[2], ['a', 'b']);
        assert.equal(args[7], 0);
        assert.equal(args[8], 0);
    });

    it('compareTools throws 422 without valid tool ids', async () => {
        guardiansImpl = {};
        await assert.rejects(makeApi().compareTools(makeUser(), { toolId1: 'a' }), is422);
    });

    it('compareTools accepts a toolIds array', async () => {
        let args;
        guardiansImpl = { compareTools: async (...a) => { args = a; return {}; } };
        await makeApi().compareTools(makeUser(), { toolIds: ['t1', 't2'] });
        assert.deepEqual(args[2], ['t1', 't2']);
    });

    it('comparePoliciesExport passes the export type through', async () => {
        let seenType;
        guardiansImpl = { comparePolicies: async (owner, type) => { seenType = type; return 'csv'; } };
        const out = await makeApi().comparePoliciesExport(makeUser(), { policyId1: 'a', policyId2: 'b' }, 'csv');
        assert.equal(out, 'csv');
        assert.equal(seenType, 'csv');
    });

    it('compareModulesExport throws 422 without two module ids', async () => {
        guardiansImpl = {};
        await assert.rejects(makeApi().compareModulesExport(makeUser(), {}, 'csv'), is422);
    });

    it('compareSchemasExport passes the type through', async () => {
        let seenType;
        guardiansImpl = { compareSchemas: async (owner, type) => { seenType = type; return 'csv'; } };
        await makeApi().compareSchemasExport(makeUser(), { schemaId1: 'a', schemaId2: 'b' }, 'csv');
        assert.equal(seenType, 'csv');
    });

    it('compareDocumentsExport passes the type through', async () => {
        let seenType;
        guardiansImpl = { compareDocuments: async (user, type) => { seenType = type; return 'csv'; } };
        await makeApi().compareDocumentsExport(makeUser(), { documentId1: 'a', documentId2: 'b' }, 'csv');
        assert.equal(seenType, 'csv');
    });

    it('compareToolsExport passes the type through', async () => {
        let seenType;
        guardiansImpl = { compareTools: async (user, type) => { seenType = type; return 'csv'; } };
        await makeApi().compareToolsExport(makeUser(), { toolId1: 'a', toolId2: 'b' }, 'csv');
        assert.equal(seenType, 'csv');
    });

    it('searchBlocks throws 422 when id or config is missing', async () => {
        guardiansImpl = {};
        await assert.rejects(makeApi().searchBlocks(makeUser(), { id: 'x' }), is422);
    });

    it('searchBlocks forwards config, id and user', async () => {
        let seen;
        guardiansImpl = { searchBlocks: async (config, id, user) => { seen = { config, id }; return ['b']; } };
        const out = await makeApi().searchBlocks(makeUser(), { id: 'i', config: { c: 1 } });
        assert.deepEqual(out, ['b']);
        assert.deepEqual(seen, { config: { c: 1 }, id: 'i' });
    });

    it('checkIndexerAvailability returns the availability result', async () => {
        guardiansImpl = { getIndexerAvailability: async () => true };
        assert.equal(await makeApi().checkIndexerAvailability(makeUser()), true);
    });

    it('checkIndexerAvailability rethrows via InternalException', async () => {
        guardiansImpl = { getIndexerAvailability: async () => { throw new Error('idx'); } };
        await assert.rejects(makeApi().checkIndexerAvailability(makeUser()), /idx/);
    });
});
