import assert from 'node:assert/strict';
import {
    makeUser, makeRes, makeLogger, FakeEntityOwner,
    internalExceptionRethrow, loadController, guardiansInterfaces
} from './_controller-harness.mjs';

const DIST = '../../dist/api/service/formulas.js';

let guardiansStub;

class FakeGuardians {
    constructor(tc) { this.tc = tc; }
    createFormula(...a) { return guardiansStub.createFormula(...a); }
    getFormulas(...a) { return guardiansStub.getFormulas(...a); }
    getFormulaById(...a) { return guardiansStub.getFormulaById(...a); }
    updateFormula(...a) { return guardiansStub.updateFormula(...a); }
    deleteFormula(...a) { return guardiansStub.deleteFormula(...a); }
    getFormulaRelationships(...a) { return guardiansStub.getFormulaRelationships(...a); }
    importFormula(...a) { return guardiansStub.importFormula(...a); }
    exportFormula(...a) { return guardiansStub.exportFormula(...a); }
    previewFormula(...a) { return guardiansStub.previewFormula(...a); }
    draftFormula(...a) { return guardiansStub.draftFormula(...a); }
    dryRunFormula(...a) { return guardiansStub.dryRunFormula(...a); }
    publishFormula(...a) { return guardiansStub.publishFormula(...a); }
    getFormulasData(...a) { return guardiansStub.getFormulasData(...a); }
}

async function load() {
    return loadController(DIST, {
        '#helpers': {
            Guardians: FakeGuardians,
            EntityOwner: FakeEntityOwner,
            InternalException: internalExceptionRethrow
        },
        '#auth': { Auth: () => () => undefined, AuthUser: () => () => undefined },
        '#middlewares': new Proxy({}, { get: () => class {} }),
        '@guardian/common': { PinoLogger: class {} },
        '@guardian/interfaces': guardiansInterfaces
    });
}

function makeApi(FormulasApi) { return new FormulasApi(makeLogger()); }

describe('FormulasApi controller logic', function () {
    this.timeout(60000);
    let FormulasApi;
    before(async () => { ({ FormulasApi } = await load()); });

    beforeEach(() => {
        guardiansStub = {
            createFormula: async (formula, owner) => ({ created: true, formula, owner }),
            getFormulas: async () => ({ items: [{ id: 'f1' }], count: 3 }),
            getFormulaById: async () => ({ id: 'f1' }),
            updateFormula: async () => ({ updated: true }),
            deleteFormula: async () => ({ deleted: true }),
            getFormulaRelationships: async () => ({ rel: true }),
            importFormula: async () => ({ imported: true }),
            exportFormula: async () => Buffer.from('zip'),
            previewFormula: async () => ({ preview: true }),
            draftFormula: async () => ({ draft: true }),
            dryRunFormula: async () => ({ dry: true }),
            publishFormula: async () => ({ published: true }),
            getFormulasData: async () => ({ data: true })
        };
    });

    it('createFormula throws 422 when formula missing', async () => {
        const api = makeApi(FormulasApi);
        await assert.rejects(api.createFormula(makeUser(), null), (e) => { assert.equal(e.getStatus(), 422); return true; });
    });

    it('createFormula delegates with owner', async () => {
        const api = makeApi(FormulasApi);
        const out = await api.createFormula(makeUser(), { name: 'F' });
        assert.equal(out.created, true);
        assert.ok(out.owner instanceof FakeEntityOwner);
    });

    it('getFormulas writes X-Total-Count and sends items', async () => {
        const api = makeApi(FormulasApi);
        const res = makeRes();
        const out = await api.getFormulas(makeUser(), res, 0, 20, 'pol1');
        assert.equal(res.headers['X-Total-Count'], 3);
        assert.deepEqual(out.payload, [{ id: 'f1' }]);
    });

    it('getFormulas passes paging+policyId to guardians', async () => {
        let seen;
        guardiansStub.getFormulas = async (opts) => { seen = opts; return { items: [], count: 0 }; };
        const api = makeApi(FormulasApi);
        await api.getFormulas(makeUser(), makeRes(), 1, 50, 'pol9');
        assert.deepEqual(seen, { policyId: 'pol9', pageIndex: 1, pageSize: 50 });
    });

    it('getFormulaById throws 422 without id', async () => {
        const api = makeApi(FormulasApi);
        await assert.rejects(api.getFormulaById(makeUser(), ''), (e) => { assert.equal(e.getStatus(), 422); return true; });
    });

    it('getFormulaById delegates', async () => {
        const api = makeApi(FormulasApi);
        assert.deepEqual(await api.getFormulaById(makeUser(), 'f1'), { id: 'f1' });
    });

    it('updateFormula throws 422 without id', async () => {
        const api = makeApi(FormulasApi);
        await assert.rejects(api.updateFormula(makeUser(), '', {}), (e) => { assert.equal(e.getStatus(), 422); return true; });
    });

    it('updateFormula throws 404 when oldItem missing', async () => {
        guardiansStub.getFormulaById = async () => null;
        const api = makeApi(FormulasApi);
        await assert.rejects(api.updateFormula(makeUser(), 'f1', {}), (e) => { assert.equal(e.getStatus(), 404); return true; });
    });

    it('updateFormula delegates when found', async () => {
        const api = makeApi(FormulasApi);
        assert.deepEqual(await api.updateFormula(makeUser(), 'f1', { x: 1 }), { updated: true });
    });

    it('deleteFormula throws 422 without id', async () => {
        const api = makeApi(FormulasApi);
        await assert.rejects(api.deleteFormula(makeUser(), ''), (e) => { assert.equal(e.getStatus(), 422); return true; });
    });

    it('deleteFormula delegates', async () => {
        const api = makeApi(FormulasApi);
        assert.deepEqual(await api.deleteFormula(makeUser(), 'f1'), { deleted: true });
    });

    it('getSchemaRuleRelationships throws 422 without id', async () => {
        const api = makeApi(FormulasApi);
        await assert.rejects(api.getSchemaRuleRelationships(makeUser(), ''), (e) => { assert.equal(e.getStatus(), 422); return true; });
    });

    it('getSchemaRuleRelationships delegates', async () => {
        const api = makeApi(FormulasApi);
        assert.deepEqual(await api.getSchemaRuleRelationships(makeUser(), 'f1'), { rel: true });
    });

    it('importFormula delegates with zip+policyId+owner', async () => {
        let seen;
        guardiansStub.importFormula = async (zip, policyId, owner) => { seen = { zip, policyId, owner }; return { ok: 1 }; };
        const api = makeApi(FormulasApi);
        await api.importFormula(makeUser(), 'pol1', { buffer: 1 });
        assert.equal(seen.policyId, 'pol1');
        assert.ok(seen.owner instanceof FakeEntityOwner);
    });

    it('exportFormula sets zip headers and sends file', async () => {
        const api = makeApi(FormulasApi);
        const res = makeRes();
        await api.exportFormula(makeUser(), 'f1', res);
        assert.equal(res.headers['Content-type'], 'application/zip');
        assert.match(res.headers['Content-disposition'], /attachment; filename=theme_/);
    });

    it('previewFormula delegates', async () => {
        const api = makeApi(FormulasApi);
        assert.deepEqual(await api.previewFormula(makeUser(), { a: 1 }), { preview: true });
    });

    it('draftFormula throws 422 without id', async () => {
        const api = makeApi(FormulasApi);
        await assert.rejects(api.draftFormula(makeUser(), ''), (e) => { assert.equal(e.getStatus(), 422); return true; });
    });

    it('draftFormula throws 404 when not found', async () => {
        guardiansStub.getFormulaById = async () => null;
        const api = makeApi(FormulasApi);
        await assert.rejects(api.draftFormula(makeUser(), 'f1'), (e) => { assert.equal(e.getStatus(), 404); return true; });
    });

    it('draftFormula delegates when found', async () => {
        const api = makeApi(FormulasApi);
        assert.deepEqual(await api.draftFormula(makeUser(), 'f1'), { draft: true });
    });

    it('dryRunFormula throws 404 when not found', async () => {
        guardiansStub.getFormulaById = async () => null;
        const api = makeApi(FormulasApi);
        await assert.rejects(api.dryRunFormula(makeUser(), 'f1'), (e) => { assert.equal(e.getStatus(), 404); return true; });
    });

    it('dryRunFormula delegates', async () => {
        const api = makeApi(FormulasApi);
        assert.deepEqual(await api.dryRunFormula(makeUser(), 'f1'), { dry: true });
    });

    it('publishFormula throws 404 when not found', async () => {
        guardiansStub.getFormulaById = async () => null;
        const api = makeApi(FormulasApi);
        await assert.rejects(api.publishFormula(makeUser(), 'f1'), (e) => { assert.equal(e.getStatus(), 404); return true; });
    });

    it('publishFormula delegates', async () => {
        const api = makeApi(FormulasApi);
        assert.deepEqual(await api.publishFormula(makeUser(), 'f1'), { published: true });
    });

    it('getSchemaRuleData throws 422 without options', async () => {
        const api = makeApi(FormulasApi);
        await assert.rejects(api.getSchemaRuleData(makeUser(), null), (e) => { assert.equal(e.getStatus(), 422); return true; });
    });

    it('getSchemaRuleData returns null without execute/manage permission', async () => {
        const api = makeApi(FormulasApi);
        const out = await api.getSchemaRuleData(makeUser({ permissions: [] }), { x: 1 });
        assert.equal(out, null);
    });

    it('getSchemaRuleData delegates when permitted', async () => {
        const api = makeApi(FormulasApi);
        const out = await api.getSchemaRuleData(makeUser({ permissions: ['POLICIES_POLICY_EXECUTE'] }), { x: 1 });
        assert.deepEqual(out, { data: true });
    });
});
