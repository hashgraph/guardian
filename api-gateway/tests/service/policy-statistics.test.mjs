import assert from 'node:assert/strict';
import {
    makeUser, makeRes, makeLogger, FakeEntityOwner,
    internalExceptionRethrow, loadController, guardiansInterfaces
} from './_controller-harness.mjs';

const DIST = '../../dist/api/service/policy-statistics.js';

let stub;

class FakeGuardians {
    constructor(tc) { this.tc = tc; }
    createStatisticDefinition(...a) { return stub.createStatisticDefinition(...a); }
    getStatisticDefinitions(...a) { return stub.getStatisticDefinitions(...a); }
    getStatisticDefinitionById(...a) { return stub.getStatisticDefinitionById(...a); }
    updateStatisticDefinition(...a) { return stub.updateStatisticDefinition(...a); }
    deleteStatisticDefinition(...a) { return stub.deleteStatisticDefinition(...a); }
    publishStatisticDefinition(...a) { return stub.publishStatisticDefinition(...a); }
    getStatisticRelationships(...a) { return stub.getStatisticRelationships(...a); }
    getStatisticDocuments(...a) { return stub.getStatisticDocuments(...a); }
    createStatisticAssessment(...a) { return stub.createStatisticAssessment(...a); }
    getStatisticAssessments(...a) { return stub.getStatisticAssessments(...a); }
    getStatisticAssessment(...a) { return stub.getStatisticAssessment(...a); }
    getStatisticAssessmentRelationships(...a) { return stub.getStatisticAssessmentRelationships(...a); }
    importStatisticDefinition(...a) { return stub.importStatisticDefinition(...a); }
    exportStatisticDefinition(...a) { return stub.exportStatisticDefinition(...a); }
    previewStatisticDefinition(...a) { return stub.previewStatisticDefinition(...a); }
}

async function load() {
    return loadController(DIST, {
        '#helpers': { Guardians: FakeGuardians, EntityOwner: FakeEntityOwner, InternalException: internalExceptionRethrow },
        '#auth': { Auth: () => () => undefined, AuthUser: () => () => undefined },
        '#middlewares': new Proxy({}, { get: () => class {} }),
        '@guardian/common': { PinoLogger: class {} },
        '@guardian/interfaces': guardiansInterfaces
    });
}

function makeApi(Api) { return new Api(makeLogger()); }

describe('PolicyStatisticsApi controller logic', function () {
    this.timeout(60000);
    let Api;
    before(async () => { ({ PolicyStatisticsApi: Api } = await load()); });

    beforeEach(() => {
        stub = {
            createStatisticDefinition: async (d, o) => ({ created: true, owner: o }),
            getStatisticDefinitions: async () => ({ items: [{ id: 's1' }], count: 4 }),
            getStatisticDefinitionById: async () => ({ id: 's1' }),
            updateStatisticDefinition: async () => ({ updated: true }),
            deleteStatisticDefinition: async () => ({ deleted: true }),
            publishStatisticDefinition: async () => ({ published: true }),
            getStatisticRelationships: async () => ({ rel: true }),
            getStatisticDocuments: async () => ({ items: [{ d: 1 }], count: 2 }),
            createStatisticAssessment: async () => ({ assessed: true }),
            getStatisticAssessments: async () => ({ items: [{ a: 1 }], count: 7 }),
            getStatisticAssessment: async () => ({ id: 'a1' }),
            getStatisticAssessmentRelationships: async () => ({ rel: true }),
            importStatisticDefinition: async () => ({ imported: true }),
            exportStatisticDefinition: async () => Buffer.from('zip'),
            previewStatisticDefinition: async () => ({ preview: true })
        };
    });

    it('createStatisticDefinition throws 422 without definition', async () => {
        await assert.rejects(makeApi(Api).createStatisticDefinition(makeUser(), null), (e) => { assert.equal(e.getStatus(), 422); return true; });
    });

    it('createStatisticDefinition delegates with owner', async () => {
        const out = await makeApi(Api).createStatisticDefinition(makeUser(), { n: 1 });
        assert.ok(out.owner instanceof FakeEntityOwner);
    });

    it('getStatisticDefinitions sets count header', async () => {
        const res = makeRes();
        await makeApi(Api).getStatisticDefinitions(makeUser(), res, 0, 10, 'topic');
        assert.equal(res.headers['X-Total-Count'], 4);
    });

    it('getStatisticDefinitions passes filter options', async () => {
        let seen;
        stub.getStatisticDefinitions = async (o) => { seen = o; return { items: [], count: 0 }; };
        await makeApi(Api).getStatisticDefinitions(makeUser(), makeRes(), 2, 5, 't9');
        assert.deepEqual(seen, { policyInstanceTopicId: 't9', pageIndex: 2, pageSize: 5 });
    });

    it('getStatisticDefinitionById throws 422 without id', async () => {
        await assert.rejects(makeApi(Api).getStatisticDefinitionById(makeUser(), ''), (e) => { assert.equal(e.getStatus(), 422); return true; });
    });

    it('getStatisticDefinitionById delegates', async () => {
        assert.deepEqual(await makeApi(Api).getStatisticDefinitionById(makeUser(), 's1'), { id: 's1' });
    });

    it('updateStatisticDefinition throws 422 without id', async () => {
        await assert.rejects(makeApi(Api).updateStatisticDefinition(makeUser(), '', {}), (e) => { assert.equal(e.getStatus(), 422); return true; });
    });

    it('updateStatisticDefinition throws 404 when not found', async () => {
        stub.getStatisticDefinitionById = async () => null;
        await assert.rejects(makeApi(Api).updateStatisticDefinition(makeUser(), 's1', {}), (e) => { assert.equal(e.getStatus(), 404); return true; });
    });

    it('updateStatisticDefinition delegates when found', async () => {
        assert.deepEqual(await makeApi(Api).updateStatisticDefinition(makeUser(), 's1', {}), { updated: true });
    });

    it('deleteStatisticDefinition throws 422 without id', async () => {
        await assert.rejects(makeApi(Api).deleteStatisticDefinition(makeUser(), ''), (e) => { assert.equal(e.getStatus(), 422); return true; });
    });

    it('deleteStatisticDefinition delegates', async () => {
        assert.deepEqual(await makeApi(Api).deleteStatisticDefinition(makeUser(), 's1'), { deleted: true });
    });

    it('publishStatisticDefinition throws 404 when not found', async () => {
        stub.getStatisticDefinitionById = async () => null;
        await assert.rejects(makeApi(Api).publishStatisticDefinition(makeUser(), 's1'), (e) => { assert.equal(e.getStatus(), 404); return true; });
    });

    it('publishStatisticDefinition delegates', async () => {
        assert.deepEqual(await makeApi(Api).publishStatisticDefinition(makeUser(), 's1'), { published: true });
    });

    it('getStatisticRelationships throws 422 without id', async () => {
        await assert.rejects(makeApi(Api).getStatisticRelationships(makeUser(), ''), (e) => { assert.equal(e.getStatus(), 422); return true; });
    });

    it('getStatisticRelationships delegates', async () => {
        assert.deepEqual(await makeApi(Api).getStatisticRelationships(makeUser(), 's1'), { rel: true });
    });

    it('getStatisticDocuments sets count header', async () => {
        const res = makeRes();
        await makeApi(Api).getStatisticDocuments(makeUser(), res, 's1', 0, 10);
        assert.equal(res.headers['X-Total-Count'], 2);
    });

    it('createStatisticAssessment throws 422 without id', async () => {
        await assert.rejects(makeApi(Api).createStatisticAssessment(makeUser(), '', {}), (e) => { assert.equal(e.getStatus(), 422); return true; });
    });

    it('createStatisticAssessment throws 422 without assessment', async () => {
        await assert.rejects(makeApi(Api).createStatisticAssessment(makeUser(), 's1', null), (e) => { assert.equal(e.getStatus(), 422); return true; });
    });

    it('createStatisticAssessment delegates', async () => {
        assert.deepEqual(await makeApi(Api).createStatisticAssessment(makeUser(), 's1', { x: 1 }), { assessed: true });
    });

    it('getStatisticAssessments throws 422 without id', async () => {
        await assert.rejects(makeApi(Api).getStatisticAssessments(makeUser(), makeRes(), '', 0, 10), (e) => { assert.equal(e.getStatus(), 422); return true; });
    });

    it('getStatisticAssessments sets count header', async () => {
        const res = makeRes();
        await makeApi(Api).getStatisticAssessments(makeUser(), res, 's1', 0, 10);
        assert.equal(res.headers['X-Total-Count'], 7);
    });

    it('getStatisticAssessment throws 422 when ids missing', async () => {
        await assert.rejects(makeApi(Api).getStatisticAssessment(makeUser(), 's1', ''), (e) => { assert.equal(e.getStatus(), 422); return true; });
    });

    it('getStatisticAssessment delegates', async () => {
        assert.deepEqual(await makeApi(Api).getStatisticAssessment(makeUser(), 's1', 'a1'), { id: 'a1' });
    });

    it('getStatisticAssessmentRelationships throws 422 when ids missing', async () => {
        await assert.rejects(makeApi(Api).getStatisticAssessmentRelationships(makeUser(), '', 'a1'), (e) => { assert.equal(e.getStatus(), 422); return true; });
    });

    it('getStatisticAssessmentRelationships delegates', async () => {
        assert.deepEqual(await makeApi(Api).getStatisticAssessmentRelationships(makeUser(), 's1', 'a1'), { rel: true });
    });

    it('importStatisticDefinition delegates with zip+policyId', async () => {
        let seen;
        stub.importStatisticDefinition = async (zip, policyId) => { seen = { zip, policyId }; return {}; };
        await makeApi(Api).importStatisticDefinition(makeUser(), 'pol1', { b: 1 });
        assert.equal(seen.policyId, 'pol1');
    });

    it('exportStatisticDefinition sets zip headers', async () => {
        const res = makeRes();
        await makeApi(Api).exportStatisticDefinition(makeUser(), 's1', res);
        assert.equal(res.headers['Content-type'], 'application/zip');
    });

    it('previewStatisticDefinition delegates', async () => {
        assert.deepEqual(await makeApi(Api).previewStatisticDefinition(makeUser(), { b: 1 }), { preview: true });
    });
});
