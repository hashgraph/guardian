import assert from 'node:assert/strict';
import JSZip from 'jszip';
import { RecordImportExport, RecordResult } from '../../../dist/import-export/record.js';

describe('RecordResult', () => {
    it('stores type, id and document', () => {
        const result = new RecordResult('vc', 'doc-1', { a: 1 });
        assert.equal(result.type, 'vc');
        assert.equal(result.id, 'doc-1');
        assert.deepEqual(result.document, { a: 1 });
    });

    it('derives name as base64 of type|id', () => {
        const result = new RecordResult('vp', 'doc-2', {});
        assert.equal(result.name, btoa('vp|doc-2'));
    });

    it('serialises the document as file', () => {
        const result = new RecordResult('schema', 's-1', { x: [1, 2] });
        assert.equal(result.file, JSON.stringify({ x: [1, 2] }));
    });

    it('from() decodes name and parses json', () => {
        const original = new RecordResult('vc', 'abc', { v: true });
        const restored = RecordResult.from(original.name, original.file);
        assert.equal(restored.type, 'vc');
        assert.equal(restored.id, 'abc');
        assert.deepEqual(restored.document, { v: true });
    });

    it('fromObject() and toObject() round-trip', () => {
        const obj = { id: 'i', type: 'vp', document: { d: 1 } };
        assert.deepEqual(RecordResult.fromObject(obj).toObject(), obj);
    });
});

describe('RecordImportExport pure helpers', () => {
    it('resultLink encodes type and id under results/', () => {
        const link = RecordImportExport.resultLink({ type: 'vc', id: 'doc-9' });
        assert.equal(link, `results/${btoa('vc|doc-9')}`);
    });

    it('hasSelectedOutputs is false without policyTest or outputs', () => {
        assert.equal(RecordImportExport.hasSelectedOutputs({ results: [] }), false);
        assert.equal(RecordImportExport.hasSelectedOutputs({ results: [], policyTest: { outputs: [] } }), false);
    });

    it('hasSelectedOutputs is true with non-empty outputs', () => {
        assert.equal(RecordImportExport.hasSelectedOutputs({ results: [], policyTest: { outputs: ['x'] } }), true);
    });

    it('getComparisonResults returns all results when no outputs selected', () => {
        const results = [{ type: 'vc', id: '1', document: {} }];
        assert.equal(RecordImportExport.getComparisonResults({ results }), results);
    });

    it('getComparisonResults filters by selected output links', () => {
        const keep = { type: 'vc', id: 'keep', document: {} };
        const drop = { type: 'vp', id: 'drop', document: {} };
        const components = {
            results: [keep, drop],
            policyTest: { outputs: [RecordImportExport.resultLink(keep)] }
        };
        assert.deepEqual(RecordImportExport.getComparisonResults(components), [keep]);
    });
});

describe('RecordImportExport.generateZipFile', () => {
    it('writes a START row into actions.csv', async () => {
        const zip = await RecordImportExport.generateZipFile({
            records: [{ method: 'START', time: 1000, user: 'did:user' }],
            results: [],
            time: 1000,
            duration: 0
        });
        const csv = await zip.files['actions.csv'].async('string');
        assert.equal(csv, 'START,0,,did:user\r\n');
    });

    it('writes ACTION rows with document references', async () => {
        const zip = await RecordImportExport.generateZipFile({
            records: [{
                method: 'ACTION',
                action: 'CreateUser',
                time: 1500,
                user: 'u1',
                target: 't1',
                document: { body: 1 },
                userRole: 'OWNER',
                recordActionId: 'ra-1'
            }],
            results: [],
            time: 1000,
            duration: 500
        });
        const csv = await zip.files['actions.csv'].async('string');
        assert.equal(csv, 'ACTION,500,CreateUser,u1,t1,0,OWNER,ra-1\r\n');
        assert.deepEqual(JSON.parse(await zip.files['documents/0'].async('string')), { body: 1 });
    });

    it('stores results files by encoded name', async () => {
        const zip = await RecordImportExport.generateZipFile({
            records: [],
            results: [{ type: 'vc', id: 'res-1', document: { ok: true } }],
            time: 0,
            duration: 0
        });
        const name = `results/${btoa('vc|res-1')}`;
        assert.deepEqual(JSON.parse(await zip.files[name].async('string')), { ok: true });
    });

    it('includes policy-test.json only when metadata is present', async () => {
        const base = { records: [], results: [], time: 0, duration: 0 };
        const without = await RecordImportExport.generateZipFile(base, null);
        assert.equal(without.files['policy-test.json'], undefined);
        const withMeta = await RecordImportExport.generateZipFile(base, { name: 'Test 1' });
        assert.deepEqual(JSON.parse(await withMeta.files['policy-test.json'].async('string')), { name: 'Test 1' });
    });
});

describe('RecordImportExport.generateSingleRecordZip', () => {
    it('packs a single record with zero diff time', async () => {
        const zip = await RecordImportExport.generateSingleRecordZip({ method: 'START', time: 5000, user: 'u' });
        const csv = await zip.files['actions.csv'].async('string');
        assert.equal(csv, 'START,0,,u\r\n');
    });
});

describe('RecordImportExport.parseZipFile', () => {
    it('round-trips records, documents and results', async () => {
        const zip = await RecordImportExport.generateZipFile({
            records: [
                { method: 'START', time: 1000, user: 'u0' },
                { method: 'ACTION', action: 'DoThing', time: 1250, user: 'u1', target: 'tg', document: { d: 2 }, userRole: 'ROLE', recordActionId: 'ra' },
                { method: 'STOP', time: 2000 }
            ],
            results: [{ type: 'vp', id: 'r1', document: { r: 1 } }],
            time: 1000,
            duration: 1000
        });
        const buffer = await zip.generateAsync({ type: 'nodebuffer' });
        const components = await RecordImportExport.parseZipFile(buffer);
        assert.equal(components.records.length, 3);
        assert.equal(components.records[0].method, 'START');
        assert.equal(components.records[1].action, 'DoThing');
        assert.equal(components.records[1].user, 'u1');
        assert.equal(components.records[1].userRole, 'ROLE');
        assert.equal(components.records[1].recordActionId, 'ra');
        assert.deepEqual(components.records[1].document, { d: 2 });
        assert.equal(components.duration, 1000);
        assert.deepEqual(components.results, [{ id: 'r1', type: 'vp', document: { r: 1 } }]);
    });

    it('parses policy test metadata when present', async () => {
        const zip = await RecordImportExport.generateZipFile(
            { records: [], results: [], time: 0, duration: 0 },
            { name: 'meta', outputs: ['results/x'] }
        );
        const buffer = await zip.generateAsync({ type: 'nodebuffer' });
        const components = await RecordImportExport.parseZipFile(buffer);
        assert.deepEqual(components.policyTest, { name: 'meta', outputs: ['results/x'] });
    });

    it('rejects a zip without actions.csv', async () => {
        const zip = new JSZip();
        zip.file('random.txt', 'hello');
        const buffer = await zip.generateAsync({ type: 'nodebuffer' });
        await assert.rejects(RecordImportExport.parseZipFile(buffer), /Zip file is not a record/);
    });

    it('exposes documented filename constants', () => {
        assert.equal(RecordImportExport.recordFileName, 'actions.csv');
        assert.equal(RecordImportExport.policyTestFileName, 'policy-test.json');
    });
});
