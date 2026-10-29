import esmock from 'esmock';
import { SplitDocuments } from '@guardian/common/entity/split-documents';
import { VcDocument as VcDocumentCollection } from '@guardian/common/entity/vc-document';
import { DocumentsSourceAddon } from '../../../dist/policy-engine/blocks/documents-source-addon.js';
import { SplitBlock } from '../../../dist/policy-engine/blocks/split-block.js';
import { PolicyUtils } from '../../../dist/policy-engine/helpers/utils.js';
import { createPreviewDatabaseServer } from '../../../dist/policy-engine/helpers/preview-database.js';
import { createInMemoryDatabaseHelper } from '../helpers/in-memory-database-helper.mjs';
import assert from 'node:assert/strict';
import { MessageResponse } from '@guardian/common/models/message-response';
import { VcDocument } from '@guardian/hedera/vcjs/vc-document';
import { HttpRequestBlock } from '../../../dist/policy-engine/blocks/http-request-block.js';
import { SwitchBlock } from '../../../dist/policy-engine/blocks/switch-block.js';
import { CustomLogicBlock } from '../../../dist/policy-engine/blocks/custom-logic-block.js';
import { RequestVcDocumentBlock } from '../../../dist/policy-engine/blocks/request-vc-document-block.js';
import { PolicyComponentsUtils } from '../../../dist/policy-engine/policy-components-utils.js';
import { isPreviewStoredDocument, markPreviewExtractedDocument, markPreviewStoredDocuments, runPreview } from '../../../dist/policy-engine/helpers/preview.js';
import { createPreviewCredential } from '../helpers/preview-document-fixture.mjs';
import { makeBlock, makeUser, makeComponents, restoreHarness } from './_block-exec-harness.mjs';

const user = makeUser();
const credential = subject => ({ schema: '#S', document: createPreviewCredential(subject, user.did, crypto.randomUUID()).toJsonTree() });

async function previewScript(documents, expression, document, paths, prepare) {
    let output;
    const response = await runPreview({ blockType: 'requestVcDocumentBlock' }, user, {}, async (_r, _u, _d, step) => {
        step.setPreviewSource({ schema: '#S', document, paths, dependencies: {} });
        const block = makeBlock(CustomLogicBlock, { options: { unsigned: true, expression } }).block;
        if (prepare) await prepare(block, step);
        block.triggerEvents = async (type, _user, state) => { if (type === 'RunEvent') output = state.data; };
        await block.runAction({ user, data: { data: documents }, actionStatus: step });
        return new MessageResponse(null);
    });
    return { response, output };
}

async function previewDatabase() {
    const db = createInMemoryDatabaseHelper();
    db.DataBaseHelper.prototype.saveMany = async function(items) {
        return Promise.all(items.map(item => this.save(item)));
    };
    const { DatabaseServer } = await esmock('@guardian/common/database-modules/database-server', {
        '@guardian/common/helpers/db-helper': { DataBaseHelper: db.DataBaseHelper }
    });
    return { db, server: createPreviewDatabaseServer(new DatabaseServer(null), null) };
}

describe('@unit Preview regressions', function () {
    this.timeout(60000);
    let external;
    let blockError;
    beforeEach(() => {
        external = PolicyComponentsUtils.ExternalEventFn;
        blockError = PolicyComponentsUtils.BlockErrorFn;
        PolicyComponentsUtils.ExternalEventFn = async () => undefined;
        PolicyComponentsUtils.BlockErrorFn = async () => undefined;
    });
    afterEach(() => {
        PolicyComponentsUtils.ExternalEventFn = external;
        PolicyComponentsUtils.BlockErrorFn = blockError;
    });
    after(() => restoreHarness());

    it('FULL-19 returns indexed requirements for an actual script cell read', async () => {
        const expression = 'done({total:documents[0].document.credentialSubject[0].rows[1].amount*2});';
        const missing = await previewScript([credential({ rows: [{}, {}, {}] })], expression,
            { rows: [{}, {}, {}] }, ['rows', 'rows.amount', 'total']);
        assert.equal(missing.response.code, 422);
        assert.deepEqual(missing.response.data.fields, ['rows.1.amount']);
        assert.deepEqual(missing.response.data.missingFields, ['rows.1.amount']);
        const input = { rows: [{}, { amount: 0 }, {}] };
        const supplied = await previewScript([credential(input)], expression, input, ['rows', 'rows.amount', 'total']);
        assert.equal(supplied.response.code, 200);
        assert.deepEqual(supplied.response.body.fields, ['rows.1.amount']);
        assert.equal(supplied.output.document.credentialSubject[0].total, 0);
    });

    it('FULL-21 excludes historical by-name source copies through the actual source addon', async () => {
        for (const mode of ['historical-filled', 'historical-missing', 'temporary-missing']) {
            const { db, server } = await previewDatabase();
            const subject = mode === 'historical-filled' ? { rate: 3 } : {};
            const source = { ...credential(subject), policyId: 'policy-1', owner: user.did };
            const historical = mode.startsWith('historical');
            if (historical) db.seed(VcDocumentCollection, [source]);
            const result = await previewScript([credential({ amount: 5 })],
                'const c={...sources[0].document.credentialSubject[0]};done({total:c.rate*2});',
                { amount: 5 }, ['amount', 'rate', 'total'], async (block) => {
                    if (!historical) await server.saveVC(source);
                    const components = makeComponents({ databaseServer: server });
                    const addon = makeBlock(DocumentsSourceAddon, { components,
                        options: { dataType: 'vc-documents', schema: '#S', filters: [] } }).block;
                    block.children.push(addon);
                });
            assert.equal(result.response.code, historical ? 200 : 422, mode);
            if (mode === 'historical-filled') {
                assert.equal(result.output.document.credentialSubject[0].total, 6);
                assert.deepEqual(result.response.body.fields, []);
            } else if (mode === 'historical-missing') {
                assert.deepEqual(result.response.body.fields, []);
                assert.ok(result.response.body.errors.length > 0);
            } else {
                assert.deepEqual(result.response.data.missingFields, ['rate']);
            }
            assert.equal(db.calls.some(([name]) => ['save', 'update', 'remove'].includes(name)), false);
        }
    });

    it('FULL-16 preserves origins through real Split and the Preview database proxy', async () => {
        const originalCredentials = PolicyUtils.getUserCredentials;
        PolicyUtils.getUserCredentials = async () => ({});
        try {
            for (const historical of [true, false]) {
                const { db, server } = await previewDatabase();
                const old = { ...credential({ amount: 5, rate: 3, flag: false }), owner: user.did };
                if (historical) db.seed(SplitDocuments, [{ id: '111111111111111111111111',
                    policyId: 'policy-1', blockId: 'split', userId: user.id, value: 5, document: old }]);
                const components = makeComponents({ databaseServer: server, generateUUID: async () => crypto.randomUUID() });
                const split = makeBlock(SplitBlock, { uuid: 'split', components,
                    options: { threshold: '10', sourceField: 'document.credentialSubject.0.amount' } }).block;
                const script = makeBlock(CustomLogicBlock, { options: { unsigned: true,
                    expression: 'let total=0;for(const item of documents){const d=item.document.credentialSubject[0];if(!d.flag)total+=d.rate*2;}done({total});' } }).block;
                let total;
                let forwarded;
                script.triggerEvents = async (type, _u, state) => {
                    if (type === 'RunEvent') total = state.data.document.credentialSubject[0].total;
                };
                const source = { amount: 5, flag: historical };
                const response = await runPreview({ blockType: 'requestVcDocumentBlock' }, user, {}, async (_r, _u, _d, step) => {
                    step.setPreviewSource({ schema: '#S', document: source, paths: ['amount', 'flag', 'rate', 'total'], dependencies: {} });
                    split.triggerEvents = async (type, _user, state) => {
                        if (type !== 'RunEvent') return;
                        forwarded = state.data.map(item => isPreviewStoredDocument(item));
                        await script.runAction({ user, data: state, actionStatus: step });
                    };
                    if (!historical) {
                        await split.runAction({ user, data: { data: { ...credential(source), owner: user.did } }, actionStatus: step });
                        const residue = await server.getResidue('policy-1', 'split', user.id);
                        assert.ok(residue.length > 0);
                        assert.equal(isPreviewStoredDocument(residue[0].document), false);
                    }
                    await split.runAction({ user, data: { data: { ...credential({ amount: 5, flag: true }), owner: user.did } }, actionStatus: step });
                    return new MessageResponse(null);
                });
                assert.equal(response.code, historical ? 200 : 422);
                assert.ok(forwarded);
                if (historical) {
                    assert.equal(total, 6);
                    assert.equal(forwarded.includes(true), true);
                    assert.deepEqual(response.body.errors, []);
                } else {
                    assert.deepEqual(response.data.missingFields, ['rate']);
                    assert.equal(forwarded.every(stored => !stored), true);
                }
                assert.equal(db.calls.some(([name]) => ['save', 'update', 'remove'].includes(name)), false);
            }
        } finally {
            PolicyUtils.getUserCredentials = originalCredentials;
        }
    });

    it('FULL-14 recovers an extracted copied object at its original path', async () => {
        const child = credential({});
        delete child.schema;
        const parent = credential({ section: {} });
        const result = await previewScript([child], 'const c={...documents[0].document.credentialSubject[0]};done({total:c["ra"+"te"]*2});',
            { section: {} }, ['section', 'section.rate', 'total'], async () => {
                markPreviewExtractedDocument(child, parent, 'section');
            });
        assert.equal(result.response.code, 422);
        assert.deepEqual(result.response.data.missingFields, ['section.rate']);
    });

    it('FULL-18 does not charge actual HTTP output fields to the form', async () => {
        let total;
        const response = await runPreview({ blockType: 'requestVcDocumentBlock' }, user, {}, async (_r, _u, _d, step) => {
            step.setPreviewSource({ schema: '#S', document: {}, paths: ['rate', 'total'], dependencies: {} });
            const http = makeBlock(HttpRequestBlock, { options: { url: 'https://fixture.invalid', method: 'GET' } }).block;
            http.requestDocument = async () => VcDocument.fromJsonTree(credential({ rate: 3 }).document);
            http.triggerEvents = async (type, _user, state) => {
                if (type !== 'RunEvent') return;
                const script = makeBlock(CustomLogicBlock, { options: { unsigned: true,
                    expression: 'done({total:documents[0].document.credentialSubject[0].rate*2});' } }).block;
                script.triggerEvents = async (event, _u, output) => {
                    if (event === 'RunEvent') total = output.data.document.credentialSubject[0].total;
                };
                await script.runAction({ user, data: state, actionStatus: step });
            };
            await http.runAction({ user, data: { data: credential({}) }, actionStatus: step });
            return new MessageResponse(null);
        });
        assert.equal(response.code, 200);
        assert.equal(total, 6);
        assert.deepEqual(response.body.fields, []);
    });

    it('FULL-15 prepares rows independently through the actual Request handler', async () => {
        const block = makeBlock(RequestVcDocumentBlock).block;
        block._schema = { iri: '#S', fields: [{ name: 'rows', isRef: true, isArray: true, fields: [
            { name: 'flag', type: 'boolean' }, { name: 'amount', type: 'number' },
            { name: 'total', type: 'number', autocalculate: true, expression: 'flag ? amount*2 : 0' }
        ] }] };
        const response = await runPreview(block, user, { document: { rows: [{ flag: true, amount: 5 }, { flag: false }] } }, async (target, _u, data, step) => {
            const output = await target.prepareDocument(data, step);
            assert.deepEqual(output.rows.map(row => row.total), [10, 0]);
            return new MessageResponse(null);
        });
        assert.equal(response.code, 200);
        assert.ok(!response.body.fields.includes('rows.1.amount'));
    });

    it('FULL-17 preserves selected stored input through aliases and function parameters', async () => {
        for (const formula of ['amount[1]>0', 'a=amount; a[1]>0', 'f(x)=x[1]; f(amount)>0']) {
            for (const selected of [1, 2]) {
                const expression = formula.replace(/\[1\]/g, `[${selected}]`);
                const response = await runPreview({ blockType: 'requestVcDocumentBlock' }, user, {}, async (_r, _u, _d, step) => {
                    step.setPreviewSource({ schema: '#S', document: {}, paths: ['amount'], dependencies: {} });
                    const old = markPreviewStoredDocuments(credential({ amount: 5 }));
                    const current = credential({});
                    const block = makeBlock(SwitchBlock, { options: { executionFlow: 'firstTrue', conditions: [
                        { type: 'equal', value: expression, tag: 'positive', actor: '' }
                    ] } }).block;
                    block.triggerEvents = async () => undefined;
                    await block.runAction({ user, data: { data: [old, current] }, actionStatus: step });
                    return new MessageResponse(null);
                });
                assert.equal(response.code, selected === 1 ? 200 : 422, expression);
                if (selected === 2) assert.deepEqual(response.data.missingFields, ['amount']);
            }
        }
    });

    it('FULL-25/C2 accepts handled missing parents and still requires unhandled children', async () => {
        const forms = [
            '(d.geo?.lat ?? 0)*2',
            '((d.geo && d.geo.lat) || 0)*2',
            '(()=>{let lat=0;if(d.geo){lat=d.geo.lat;}return lat*2;})()',
            '(d.geo ? d.geo.lat : 0)*2'
        ];
        for (const value of forms) {
            for (const lat of [undefined, 0, 3]) {
                const input = lat === undefined ? {} : { geo: { lat } };
                const result = await previewScript([credential(input)], 'const d=documents[0].document.credentialSubject[0];done({total:'+value+'});', input, ['geo', 'geo.lat', 'total']);
                assert.equal(result.response.code, 200, value);
                assert.equal(result.output.document.credentialSubject[0].total, (lat ?? 0) * 2);
            }
            const block = makeBlock(RequestVcDocumentBlock).block;
            block._schema = { iri: '#S', fields: [
                { name: 'geo', isRef: true, fields: [{ name: 'lat', type: 'number' }] },
                { name: 'total', type: 'number', autocalculate: true, expression: value.replaceAll('d.geo', 'this.geo') }
            ] };
            const response = await runPreview(block, user, { document: {} }, async (target, _u, data, step) => {
                const output = await target.prepareDocument(data, step);
                assert.equal(output.total, 0);
                return new MessageResponse(null);
            });
            assert.equal(response.code, 200, value);
        }
        const required = await previewScript([credential({ geo: {} })], 'const d=documents[0].document.credentialSubject[0];done({total:d.geo ? d.geo.lat*2 : 0});', { geo: {} }, ['geo', 'geo.lat', 'total']);
        assert.equal(required.response.code, 422);
        assert.deepEqual(required.response.data.missingFields, ['geo.lat']);
    });

    it('FULL-22 recovers the copied nested section in autocalculate', async () => {
        const block = makeBlock(RequestVcDocumentBlock).block;
        block._schema = { iri: '#S', fields: [
            { name: 'costs', isRef: true, fields: [{ name: 'amount', type: 'number' }] },
            { name: 'total', type: 'number', autocalculate: true,
                expression: '(()=>{const c={...costs};return c["amo"+"unt"]*2})()' }
        ] };
        for (const amount of [undefined, 0, 3]) {
            let output;
            const response = await runPreview(block, user, { document: { costs: amount === undefined ? {} : { amount } } }, async (target, _u, data, step) => {
                output = await target.prepareDocument(data, step);
                return new MessageResponse(null);
            });
            assert.equal(response.code, amount === undefined ? 422 : 200);
            if (amount === undefined) assert.deepEqual(response.data.missingFields, ['costs.amount']);
            else assert.equal(output.total, amount * 2);
        }
    });

    it('FULL-21 tracks direct and copied current-form source reads, excluding history', async () => {
        for (const copy of [false, true]) {
            const expression = 'const original=sources[0].document.credentialSubject[0];const c=' + (copy ? '{...original}' : 'original') + ';done({total:c["ra"+"te"]*2});';
            const missing = await previewScript([], expression, {}, ['rate', 'total'], async block => {
                block.getSources = async () => [credential({})];
            });
            assert.equal(missing.response.code, 422);
            assert.deepEqual(missing.response.data.missingFields, ['rate']);
            const historical = await previewScript([], expression, {}, ['rate', 'total'], async block => {
                block.getSources = async () => [markPreviewStoredDocuments(credential({ rate: 3 }))];
            });
            assert.equal(historical.response.code, 200);
            assert.equal(historical.output.document.credentialSubject[0].total, 6);
            assert.deepEqual(historical.response.body.fields, []);
        }
    });

    it('FULL-20 recovers the actual copied document when several form documents arrive', async () => {
        const expression = 'const c={...documents[0].document.credentialSubject[0]};done({total:c["ra"+"te"]*2});';
        const missing = await previewScript([credential({}), credential({})], expression, {}, ['rate', 'total']);
        assert.equal(missing.response.code, 422);
        assert.deepEqual(missing.response.data.missingFields, ['rate']);
        const zero = await previewScript([credential({ rate: 0 }), credential({})], expression, { rate: 0 }, ['rate', 'total']);
        assert.equal(zero.response.code, 200);
        assert.equal(zero.output.document.credentialSubject[0].total, 0);
    });
});
