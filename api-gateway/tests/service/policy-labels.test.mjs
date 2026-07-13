import assert from 'node:assert/strict';
import {
    makeUser, makeRes, makeLogger, FakeEntityOwner,
    internalExceptionRethrow, loadController, guardiansInterfaces
} from './_controller-harness.mjs';

const DIST = '../../dist/api/service/policy-labels.js';

let stub;

class FakeGuardians {
    constructor(tc) { this.tc = tc; }
    createPolicyLabel(...a) { return stub.createPolicyLabel(...a); }
    getPolicyLabels(...a) { return stub.getPolicyLabels(...a); }
    getPolicyLabelById(...a) { return stub.getPolicyLabelById(...a); }
    updatePolicyLabel(...a) { return stub.updatePolicyLabel(...a); }
    deletePolicyLabel(...a) { return stub.deletePolicyLabel(...a); }
    publishPolicyLabel(...a) { return stub.publishPolicyLabel(...a); }
    publishPolicyLabelAsync(...a) { return stub.publishPolicyLabelAsync(...a); }
    getPolicyLabelRelationships(...a) { return stub.getPolicyLabelRelationships(...a); }
    importPolicyLabel(...a) { return stub.importPolicyLabel(...a); }
    exportPolicyLabel(...a) { return stub.exportPolicyLabel(...a); }
    previewPolicyLabel(...a) { return stub.previewPolicyLabel(...a); }
    searchComponents(...a) { return stub.searchComponents(...a); }
    getPolicyLabelTokens(...a) { return stub.getPolicyLabelTokens(...a); }
    getPolicyLabelTokenDocuments(...a) { return stub.getPolicyLabelTokenDocuments(...a); }
    createLabelDocument(...a) { return stub.createLabelDocument(...a); }
    getLabelDocuments(...a) { return stub.getLabelDocuments(...a); }
    getLabelDocument(...a) { return stub.getLabelDocument(...a); }
    getLabelDocumentRelationships(...a) { return stub.getLabelDocumentRelationships(...a); }
}

class FakeTaskManager {
    start(action, userId) { return { taskId: 'task-1', action, userId }; }
    addError() {}
    registerCallback() {}
}

async function load() {
    return loadController(DIST, {
        '#helpers': {
            Guardians: FakeGuardians, EntityOwner: FakeEntityOwner,
            InternalException: internalExceptionRethrow, TaskManager: FakeTaskManager
        },
        '#auth': { Auth: () => () => undefined, AuthUser: () => () => undefined },
        '#middlewares': new Proxy({}, { get: () => class {} }),
        '@guardian/common': { PinoLogger: class {}, RunFunctionAsync: () => undefined },
        '@guardian/interfaces': guardiansInterfaces
    });
}

function makeApi(Api) { return new Api(makeLogger()); }

describe('PolicyLabelsApi controller logic', function () {
    this.timeout(60000);
    let Api;
    before(async () => { ({ PolicyLabelsApi: Api } = await load()); });

    beforeEach(() => {
        stub = {
            createPolicyLabel: async (l, o) => ({ created: true, owner: o }),
            getPolicyLabels: async () => ({ items: [{ id: 'l1' }], count: 6 }),
            getPolicyLabelById: async () => ({ id: 'l1' }),
            updatePolicyLabel: async () => ({ updated: true }),
            deletePolicyLabel: async () => ({ deleted: true }),
            publishPolicyLabel: async () => ({ published: true }),
            publishPolicyLabelAsync: async () => ({}),
            getPolicyLabelRelationships: async () => ({ rel: true }),
            importPolicyLabel: async () => ({ imported: true }),
            exportPolicyLabel: async () => Buffer.from('zip'),
            previewPolicyLabel: async () => ({ preview: true }),
            searchComponents: async () => ({ search: true }),
            getPolicyLabelTokens: async () => ({ items: [{ t: 1 }], count: 3 }),
            getPolicyLabelTokenDocuments: async () => ({ doc: true }),
            createLabelDocument: async () => ({ labelCreated: true }),
            getLabelDocuments: async () => ({ items: [{ d: 1 }], count: 9 }),
            getLabelDocument: async () => ({ id: 'd1' }),
            getLabelDocumentRelationships: async () => ({ rel: true })
        };
    });

    it('createPolicyLabel throws 422 without label', async () => {
        await assert.rejects(makeApi(Api).createPolicyLabel(makeUser(), null), (e) => { assert.equal(e.getStatus(), 422); return true; });
    });

    it('createPolicyLabel delegates with owner', async () => {
        const out = await makeApi(Api).createPolicyLabel(makeUser(), { n: 1 });
        assert.ok(out.owner instanceof FakeEntityOwner);
    });

    it('getPolicyLabels sets count header', async () => {
        const res = makeRes();
        await makeApi(Api).getPolicyLabels(makeUser(), res, 0, 10, 'topic');
        assert.equal(res.headers['X-Total-Count'], 6);
    });

    it('getPolicyLabels passes filter options', async () => {
        let seen;
        stub.getPolicyLabels = async (o) => { seen = o; return { items: [], count: 0 }; };
        await makeApi(Api).getPolicyLabels(makeUser(), makeRes(), 1, 7, 'top1');
        assert.deepEqual(seen, { policyInstanceTopicId: 'top1', pageIndex: 1, pageSize: 7 });
    });

    it('getPolicyLabelById throws 422 without id', async () => {
        await assert.rejects(makeApi(Api).getPolicyLabelById(makeUser(), ''), (e) => { assert.equal(e.getStatus(), 422); return true; });
    });

    it('getPolicyLabelById delegates', async () => {
        assert.deepEqual(await makeApi(Api).getPolicyLabelById(makeUser(), 'l1'), { id: 'l1' });
    });

    it('updatePolicyLabel throws 404 when not found', async () => {
        stub.getPolicyLabelById = async () => null;
        await assert.rejects(makeApi(Api).updatePolicyLabel(makeUser(), 'l1', {}), (e) => { assert.equal(e.getStatus(), 404); return true; });
    });

    it('updatePolicyLabel delegates when found', async () => {
        assert.deepEqual(await makeApi(Api).updatePolicyLabel(makeUser(), 'l1', {}), { updated: true });
    });

    it('deletePolicyLabel throws 422 without id', async () => {
        await assert.rejects(makeApi(Api).deletePolicyLabel(makeUser(), ''), (e) => { assert.equal(e.getStatus(), 422); return true; });
    });

    it('deletePolicyLabel delegates', async () => {
        assert.deepEqual(await makeApi(Api).deletePolicyLabel(makeUser(), 'l1'), { deleted: true });
    });

    it('publishPolicyLabel throws 404 when not found', async () => {
        stub.getPolicyLabelById = async () => null;
        await assert.rejects(makeApi(Api).publishPolicyLabel(makeUser(), 'l1'), (e) => { assert.equal(e.getStatus(), 404); return true; });
    });

    it('publishPolicyLabel delegates', async () => {
        assert.deepEqual(await makeApi(Api).publishPolicyLabel(makeUser(), 'l1'), { published: true });
    });

    it('publishPolicyLabelAsync throws 422 without id', async () => {
        await assert.rejects(makeApi(Api).publishPolicyLabelAsync(makeUser(), ''), (e) => { assert.equal(e.getStatus(), 422); return true; });
    });

    it('publishPolicyLabelAsync throws 404 when not found', async () => {
        stub.getPolicyLabelById = async () => null;
        await assert.rejects(makeApi(Api).publishPolicyLabelAsync(makeUser(), 'l1'), (e) => { assert.equal(e.getStatus(), 404); return true; });
    });

    it('publishPolicyLabelAsync returns a task', async () => {
        const out = await makeApi(Api).publishPolicyLabelAsync(makeUser(), 'l1');
        assert.equal(out.taskId, 'task-1');
    });

    it('getPolicyLabelRelationships throws 422 without id', async () => {
        await assert.rejects(makeApi(Api).getPolicyLabelRelationships(makeUser(), ''), (e) => { assert.equal(e.getStatus(), 422); return true; });
    });

    it('getPolicyLabelRelationships delegates', async () => {
        assert.deepEqual(await makeApi(Api).getPolicyLabelRelationships(makeUser(), 'l1'), { rel: true });
    });

    it('importPolicyLabel delegates with zip+policyId', async () => {
        let seen;
        stub.importPolicyLabel = async (zip, policyId) => { seen = policyId; return {}; };
        await makeApi(Api).importPolicyLabel(makeUser(), 'pol1', { b: 1 });
        assert.equal(seen, 'pol1');
    });

    it('exportPolicyLabel sets zip headers', async () => {
        const res = makeRes();
        await makeApi(Api).exportPolicyLabel(makeUser(), 'l1', res);
        assert.equal(res.headers['Content-type'], 'application/zip');
    });

    it('previewPolicyLabel delegates', async () => {
        assert.deepEqual(await makeApi(Api).previewPolicyLabel(makeUser(), {}), { preview: true });
    });

    it('searchComponents delegates', async () => {
        assert.deepEqual(await makeApi(Api).searchComponents(makeUser(), {}), { search: true });
    });

    it('getPolicyLabelTokens sets count header', async () => {
        const res = makeRes();
        await makeApi(Api).getPolicyLabelTokens(makeUser(), res, 'l1', 0, 10);
        assert.equal(res.headers['X-Total-Count'], 3);
    });

    it('getPolicyLabelDocument delegates with documentId+definitionId', async () => {
        let seen;
        stub.getPolicyLabelTokenDocuments = async (documentId, definitionId) => { seen = { documentId, definitionId }; return {}; };
        await makeApi(Api).getPolicyLabelDocument(makeUser(), 'def1', 'doc1');
        assert.deepEqual(seen, { documentId: 'doc1', definitionId: 'def1' });
    });

    it('createStatisticDocument throws 422 without id', async () => {
        await assert.rejects(makeApi(Api).createStatisticDocument(makeUser(), '', {}), (e) => { assert.equal(e.getStatus(), 422); return true; });
    });

    it('createStatisticDocument throws 422 without document', async () => {
        await assert.rejects(makeApi(Api).createStatisticDocument(makeUser(), 'l1', null), (e) => { assert.equal(e.getStatus(), 422); return true; });
    });

    it('createStatisticDocument delegates', async () => {
        assert.deepEqual(await makeApi(Api).createStatisticDocument(makeUser(), 'l1', { x: 1 }), { labelCreated: true });
    });

    it('getLabelDocuments throws 422 without id', async () => {
        await assert.rejects(makeApi(Api).getLabelDocuments(makeUser(), makeRes(), '', 0, 10), (e) => { assert.equal(e.getStatus(), 422); return true; });
    });

    it('getLabelDocuments sets count header', async () => {
        const res = makeRes();
        await makeApi(Api).getLabelDocuments(makeUser(), res, 'l1', 0, 10);
        assert.equal(res.headers['X-Total-Count'], 9);
    });

    it('getLabelDocument throws 422 when ids missing', async () => {
        await assert.rejects(makeApi(Api).getLabelDocument(makeUser(), 'l1', ''), (e) => { assert.equal(e.getStatus(), 422); return true; });
    });

    it('getLabelDocument delegates', async () => {
        assert.deepEqual(await makeApi(Api).getLabelDocument(makeUser(), 'l1', 'd1'), { id: 'd1' });
    });

    it('getStatisticAssessmentRelationships throws 422 when ids missing', async () => {
        await assert.rejects(makeApi(Api).getStatisticAssessmentRelationships(makeUser(), '', 'd1'), (e) => { assert.equal(e.getStatus(), 422); return true; });
    });

    it('getStatisticAssessmentRelationships delegates', async () => {
        assert.deepEqual(await makeApi(Api).getStatisticAssessmentRelationships(makeUser(), 'l1', 'd1'), { rel: true });
    });
});
