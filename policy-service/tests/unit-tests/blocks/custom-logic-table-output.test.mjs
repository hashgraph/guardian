import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { gunzipSync } from 'node:zlib';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import esmock from 'esmock';
import { PolicyStatus, ScriptLanguageOption } from '@guardian/interfaces';
import { DatabaseServer } from '@guardian/common/database-modules/database-server';
import { IPFS } from '@guardian/common/helpers/ipfs';
import { PolicyUtils } from '../../../dist/policy-engine/helpers/utils.js';
import { RecordActionStep } from '../../../dist/policy-engine/record-action-step.js';
import { CustomLogicBlock as RealCustomLogicBlock } from '../../../dist/policy-engine/blocks/custom-logic-block.js';
import { makeBlock, makeUser, restoreHarness } from './_block-exec-harness.mjs';
import { itInFullWorkerRun } from '../helpers/full-worker-run.mjs';

const columns = [{ name: 'Year', key: 'year' }, { name: 'CO2', key: 'co2' }];
const tableField = (declared = columns) => ({ type: 'string', $comment: JSON.stringify({ term: 'table', customType: 'table', tableColumns: declared }) });
const table = (year = 2020) => ({ type: 'table', rows: [{ year, co2: 5 }] });
const schema = (properties = { out: tableField() }, extra = {}) => ({
    iri: '#out', contextURL: 'ctx', name: 'Output',
    document: JSON.stringify({ $id: '#out', title: 'Output', type: 'object', properties, ...extra })
});
const deferred = () => {
    let resolve;
    let reject;
    const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
    return { promise, resolve, reject };
};

let deliver;
let dockerRun;
class ScriptWorker extends EventEmitter {
    constructor() {
        super();
        queueMicrotask(() => deliver(this));
    }
    async terminate() { return 0; }
}
const { CustomLogicBlock } = await esmock.p('../../../dist/policy-engine/blocks/custom-logic-block.js', {
    'node:worker_threads': { Worker: ScriptWorker },
    '../../../dist/policy-engine/helpers/workers/custom-logic-python-docker-worker.js': {
        runPythonInDocker: (...args) => dockerRun(...args)
    }
});

const input = () => ({ schema: '#in', document: { credentialSubject: [{ input: 3 }] } });
const subject = (item) => item.document.credentialSubject[0];

describe('@unit customLogic table outputs', () => {
    let original;
    let writes;
    let pins;
    let deleted;
    let loads;
    let outputSchema;
    let environment;

    beforeEach(() => {
        original = { load: PolicyUtils.loadSchemaByID, upsert: DatabaseServer.upsertGridFile, remove: DatabaseServer.deleteGridFile, pin: IPFS.addFile, unpin: IPFS.deleteCid };
        environment = { mode: process.env.PYTHON_SANDBOX_MODE, timeout: process.env.PYTHON_SANDBOX_TIMEOUT_MS, concurrency: process.env.CUSTOM_LOGIC_CONCURRENCY };
        process.env.CUSTOM_LOGIC_CONCURRENCY = '2';
        writes = [];
        pins = [];
        deleted = [];
        loads = [];
        outputSchema = schema();
        PolicyUtils.loadSchemaByID = async (_ref, id) => { loads.push(id); return outputSchema; };
        DatabaseServer.upsertGridFile = async (file) => { writes.push(file); return { fileId: `file-${writes.length}` }; };
        DatabaseServer.deleteGridFile = async (id) => { deleted.push(id); };
        IPFS.addFile = async (buffer) => { pins.push(buffer); return { cid: `cid-${pins.length}` }; };
        IPFS.deleteCid = async () => assert.fail('IPFS content is retained');
        deliver = (worker) => worker.emit('message', { type: 'done', result: { out: table() }, final: true });
    });

    afterEach(() => {
        PolicyUtils.loadSchemaByID = original.load;
        DatabaseServer.upsertGridFile = original.upsert;
        DatabaseServer.deleteGridFile = original.remove;
        IPFS.addFile = original.pin;
        IPFS.deleteCid = original.unpin;
        for (const [name, value] of Object.entries({ PYTHON_SANDBOX_MODE: environment.mode, PYTHON_SANDBOX_TIMEOUT_MS: environment.timeout, CUSTOM_LOGIC_CONCURRENCY: environment.concurrency })) {
            if (value === undefined) delete process.env[name]; else process.env[name] = value;
        }
        restoreHarness();
    });

    const setup = (options = {}, Class = CustomLogicBlock) => makeBlock(Class, { options: { unsigned: true, outputSchema: '#out', ...options } }).block;
    const execute = (block, preview = false, emit = async () => {}) => block.execute({ data: input() }, makeUser(), emit, 'user-1', preview ? new RecordActionStep(() => {}, 0, true, true, undefined, true) : undefined);
    const send = (result) => { deliver = (worker) => worker.emit('message', { type: 'done', result, final: true }); };
    const csv = (index = 0) => gunzipSync(writes[index].buffer).toString();

    it('stores published rows in declared order before signed document creation', async () => {
        const block = setup({ unsigned: false });
        block.aggregateMetadata = async () => ({});
        block.createDocument = async (json) => {
            assert.equal(typeof json.out, 'string');
            return { schema: '#out', document: { credentialSubject: [json] } };
        };
        const emitted = [];
        const item = await execute(block, false, async (value) => { emitted.push(value); });
        assert.deepEqual(JSON.parse(subject(item).out), { type: 'table', fileId: 'file-1', cid: 'cid-1', columnNames: ['Year', 'CO2'], columnKeys: ['year', 'co2'] });
        assert.equal(csv(), 'Year,CO2\r\n2020,5');
        assert.equal(writes[0].contentType, 'application/gzip');
        assert.deepEqual(pins, [writes[0].buffer]);
        assert.deepEqual(emitted, [item]);
        assert.deepEqual(deleted, []);
    });

    it('stores unsigned Dry Run rows in GridFS without a CID', async () => {
        const block = setup();
        block.setPolicyInstance('policy-1', { id: 'policy-1', status: PolicyStatus.DRY_RUN });
        const item = await execute(block);
        assert.equal(JSON.parse(subject(item).out).fileId, 'file-1');
        assert.equal(Object.hasOwn(JSON.parse(subject(item).out), 'cid'), false);
        assert.equal(csv(), 'Year,CO2\r\n2020,5');
        assert.deepEqual(pins, []);
    });

    it('returns inline CSV in Preview without storing or pinning files', async () => {
        const item = await execute(setup(), true);
        const value = JSON.parse(subject(item).out);
        assert.match(value.fileId, /^preview-/);
        assert.deepEqual({ ...value, fileId: undefined }, { type: 'table', fileId: undefined, csv: 'Year,CO2\r\n2020,5', columnNames: ['Year', 'CO2'], columnKeys: ['year', 'co2'] });
        assert.deepEqual(writes, []);
        assert.deepEqual(pins, []);
    });

    it('converts tables in single and array sub-schemas in place', async () => {
        outputSchema = schema({ site: { $ref: '#Site' }, sites: { type: 'array', items: { $ref: '#Site' } } }, { $defs: { '#Site': { type: 'object', properties: { out: tableField() } } } });
        const json = { site: { out: table() }, sites: [{ out: table(2021) }, { out: table(2022) }] };
        const site = json.site;
        const sites = json.sites;
        send(json);
        const item = await execute(setup());
        assert.equal(json.site, site);
        assert.equal(json.sites, sites);
        assert.equal(JSON.parse(subject(item).site.out).fileId, 'file-1');
        assert.deepEqual(subject(item).sites.map((s) => JSON.parse(s.out).fileId), ['file-2', 'file-3']);
        assert.equal(csv(2), 'Year,CO2\r\n2022,5');
    });

    it('converts multiple table answers while preserving a stored reference', async () => {
        outputSchema = schema({ out: { ...tableField(), type: 'array', items: { type: 'string' } } });
        const reference = JSON.stringify({ type: 'table', fileId: 'existing', columnKeys: ['year'], columnNames: ['Year'] });
        send({ out: [table(), reference, table(2021)] });
        const item = await execute(setup());
        assert.equal(subject(item).out[1], reference);
        assert.deepEqual([0, 2].map((i) => JSON.parse(subject(item).out[i]).fileId), ['file-1', 'file-2']);
        assert.equal(writes.length, 2);
    });

    it('rejects missing declared columns before storing', async () => {
        outputSchema = schema({ out: tableField([]) });
        await assert.rejects(execute(setup()), /Table output "out" has no declared columns/);
        assert.deepEqual(writes, []);
    });

    it('rejects undeclared row keys and reports the nested schema path', async () => {
        outputSchema = schema({ site: { $ref: '#Site' } }, { $defs: { '#Site': { type: 'object', properties: { out: tableField() } } } });
        send({ site: { out: { type: 'table', rows: [{ year: 1, extra: 2 }] } } });
        await assert.rejects(execute(setup()), /Table output "site.out" has unknown columns: extra/);
        assert.deepEqual(writes, []);
    });

    it('rolls back an earlier table when another field fails conversion', async () => {
        outputSchema = schema({ out: tableField(), bad: tableField([]) });
        send({ out: table(), bad: table() });
        await assert.rejects(execute(setup()), /has no declared columns/);
        assert.deepEqual(deleted, ['file-1']);
        assert.equal(pins.length, 1);
    });

    for (const [name, value] of [
        ['stored reference', { type: 'table', fileId: 'existing', rows: [] }],
        ['array string', '[{"year":2020}]'], ['plain array', [{ year: 2020 }]],
        ['malformed rows', { type: 'table', rows: 'bad' }], ['null', null]
    ]) {
        it(`preserves a ${name} without schema or storage work`, async () => {
            send({ out: value });
            const item = await execute(setup());
            assert.deepEqual(subject(item).out, value);
            assert.deepEqual(loads, []);
            assert.deepEqual(writes, []);
        });
    }

    it('stores a header-only table for zero rows and empty cells for non-object rows', async () => {
        send({ out: { type: 'table', rows: [] } });
        await execute(setup());
        assert.equal(csv(), 'Year,CO2');
        send({ out: { type: 'table', rows: [null, 5] } });
        await execute(setup());
        assert.equal(csv(1), 'Year,CO2\r\n,\r\n,');
    });

    for (const preview of [false, true]) {
        it(`uses the passed document schema and converts every subject with preview=${preview}`, async () => {
            const json = { schema: '#original', document: { credentialSubject: [{ out: table() }, { out: table(2021) }] } };
            send(json);
            const item = await execute(setup({ passOriginal: true, outputSchema: '#wrong' }), preview);
            assert.equal(item, json);
            assert.deepEqual(loads, ['#original']);
            for (const s of item.document.credentialSubject) assert.equal(JSON.parse(s.out).type, 'table');
            assert.equal(writes.length, preview ? 0 : 2);
        });
    }

    for (const passOriginal of [false, true]) {
        it(`preserves rows with no configured schema and passOriginal=${passOriginal}`, async () => {
            const result = passOriginal ? { document: { credentialSubject: { out: table() } } } : { out: table() };
            send(result);
            const item = await execute(setup({ passOriginal, outputSchema: undefined }));
            assert.deepEqual(passOriginal ? item : subject(item), result);
            assert.deepEqual(loads, []);
            assert.deepEqual(writes, []);
        });
    }

    it('does not resolve a schema when no output rows were written', async () => {
        send({ value: 42, nested: { text: 'unchanged' } });
        outputSchema = undefined;
        const item = await execute(setup());
        assert.deepEqual(subject(item), { value: 42, nested: { text: 'unchanged' } });
        assert.deepEqual(loads, []);
        assert.deepEqual(writes, []);
    });

    it('leaves a table-shaped value in a non-Table field untouched', async () => {
        outputSchema = schema({ out: { type: 'object' } });
        const result = { out: table() };
        send(result);
        assert.deepEqual(subject(await execute(setup())), result);
        assert.deepEqual(writes, []);
    });

    for (const preview of [false, true]) {
        it(`rejects an unresolved configured schema with preview=${preview}`, async () => {
            outputSchema = undefined;
            await assert.rejects(execute(setup(), preview), /Table output schema "#out" was not found/);
            assert.deepEqual(writes, []);
        });
    }

    it('preserves an error thrown by schema loading', async () => {
        const error = new Error('schema unavailable');
        PolicyUtils.loadSchemaByID = async () => { throw error; };
        await assert.rejects(execute(setup()), (e) => e === error);
        assert.deepEqual(writes, []);
    });

    it('preserves commas, line breaks, unicode and quotes in CSV cells', async () => {
        send({ out: { type: 'table', rows: [{ year: 'a,b', co2: 'line1\nline2' }, { year: '世界', co2: 'say "hi"' }] } });
        await execute(setup());
        assert.equal(csv(), 'Year,CO2\r\n"a,b","line1\nline2"\r\n世界,"say ""hi"""');
    });

    it('converts a conditional Table field exposed by the Schema parser', async () => {
        outputSchema = schema({ enabled: { type: 'boolean' } }, { allOf: [{ if: { properties: { enabled: { const: true } } }, then: { properties: { out: tableField() }, required: ['out'] } }] });
        send({ enabled: true, out: table() });
        const item = await execute(setup());
        assert.equal(JSON.parse(subject(item).out).fileId, 'file-1');
        assert.equal(subject(item).enabled, true);
    });

    it('keeps an earlier completed call when a later call fails creation', async () => {
        const firstEmitted = deferred();
        deliver = (worker) => {
            worker.emit('message', { type: 'done', result: { out: table() }, final: false });
            firstEmitted.promise.then(() => worker.emit('message', { type: 'done', result: { out: table(2021), fail: true }, final: true }));
        };
        const block = setup();
        const create = block.createUnsignedDocument.bind(block);
        block.createUnsignedDocument = async (json, ...args) => { if (json.fail) throw new Error('creation failed'); return create(json, ...args); };
        const emitted = [];
        await assert.rejects(execute(block, false, async (item) => { emitted.push(item); firstEmitted.resolve(); }), /creation failed/);
        assert.equal(emitted.length, 1);
        assert.equal(JSON.parse(subject(emitted[0]).out).fileId, 'file-1');
        assert.deepEqual(deleted, ['file-2']);
    });

    it('waits for concurrent writes before rolling back a failed array call', async () => {
        const started = deferred();
        const release = deferred();
        const failed = deferred();
        DatabaseServer.upsertGridFile = async (file) => {
            writes.push(file);
            const id = `file-${writes.length}`;
            if (id === 'file-1') { started.resolve(); await release.promise; }
            return { fileId: id };
        };
        send([{ out: table() }, { out: table(2021), fail: true }]);
        const block = setup();
        const create = block.createUnsignedDocument.bind(block);
        block.createUnsignedDocument = async (json, ...args) => { if (json.fail) { failed.resolve(); throw new Error('creation failed'); } return create(json, ...args); };
        const emitted = [];
        const result = execute(block, false, async (item) => { emitted.push(item); });
        const rejected = assert.rejects(result, /creation failed/);
        await Promise.all([started.promise, failed.promise]);
        assert.deepEqual(deleted, []);
        release.resolve();
        await rejected;
        assert.deepEqual([...deleted].sort(), ['file-1', 'file-2']);
        assert.deepEqual(emitted, []);
    });

    for (const failCreation of [false, true]) {
        it(`handles a late write after worker rejection with creation failure=${failCreation}`, async () => {
            const started = deferred();
            const release = deferred();
            const finished = deferred();
            DatabaseServer.upsertGridFile = async (file) => { writes.push(file); started.resolve(); await release.promise; return { fileId: 'late-file' }; };
            const remove = DatabaseServer.deleteGridFile;
            DatabaseServer.deleteGridFile = async (id) => { await remove(id); finished.resolve(); };
            deliver = (worker) => {
                worker.emit('message', { type: 'done', result: { out: table() }, final: false });
                started.promise.then(() => worker.emit('message', { type: 'error', error: 'script crashed' }));
            };
            const block = setup();
            if (failCreation) block.createUnsignedDocument = async () => { throw new Error('creation failed'); };
            const emitted = [];
            await assert.rejects(execute(block, false, async (item) => { emitted.push(item); finished.resolve(); }), /script crashed/);
            release.resolve();
            await finished.promise;
            assert.deepEqual(deleted, failCreation ? ['late-file'] : []);
            assert.equal(emitted.length, failCreation ? 0 : 1);
            if (!failCreation) assert.equal(JSON.parse(subject(emitted[0]).out).fileId, 'late-file');
        });
    }

    it('retains output files when a downstream event fails', async () => {
        await assert.rejects(execute(setup(), false, async () => { throw new Error('downstream failed'); }), /downstream failed/);
        assert.equal(writes.length, 1);
        assert.deepEqual(deleted, []);
    });

    it('rolls back a GridFS file after IPFS failure', async () => {
        IPFS.addFile = async () => { throw new Error('pin failed'); };
        await assert.rejects(execute(setup()), /pin failed/);
        assert.deepEqual(deleted, ['file-1']);
    });

    it('converts table results delivered by the Docker callback', async () => {
        process.env.PYTHON_SANDBOX_MODE = 'docker';
        process.env.PYTHON_SANDBOX_TIMEOUT_MS = '10000';
        dockerRun = async (_data, callbacks) => { callbacks.onDone({ out: table() }, true); };
        const item = await execute(setup({ selectedScriptLanguage: ScriptLanguageOption.PYTHON }));
        assert.equal(JSON.parse(subject(item).out).fileId, 'file-1');
        assert.equal(csv(), 'Year,CO2\r\n2020,5');
    });

    for (const preview of [false, true]) {
        itInFullWorkerRun(`converts JavaScript worker output with preview=${preview}`, async function () {
            this.timeout(20000);
            const item = await execute(setup({ expression: "done({out:{type:'table',rows:[{year:2020,co2:5}]}});" }, RealCustomLogicBlock), preview);
            const value = JSON.parse(subject(item).out);
            assert.deepEqual(value.columnKeys, ['year', 'co2']);
            if (preview) {
                assert.equal(value.csv, 'Year,CO2\r\n2020,5');
                assert.deepEqual(writes, []);
                assert.deepEqual(pins, []);
            } else {
                assert.equal(value.fileId, 'file-1');
                assert.equal(csv(), 'Year,CO2\r\n2020,5');
            }
        });
    }

    itInFullWorkerRun('converts native Python dictionaries and lists through Pyodide', async function () {
        this.timeout(30000);
        const require = createRequire(import.meta.url);
        const directory = require.resolve('pyodide').replace(/[^/]+$/, '');
        for (const file of ['pyodide.asm.wasm', 'python_stdlib.zip', 'micropip-0.6.0-py3-none-any.whl', 'packaging-23.2-py3-none-any.whl']) {
            if (!existsSync(directory + file)) this.skip();
        }
        process.env.PYTHON_SANDBOX_MODE = 'pyodide';
        process.env.PYTHON_SANDBOX_TIMEOUT_MS = '25000';
        const item = await execute(setup({ selectedScriptLanguage: ScriptLanguageOption.PYTHON, expression: "done({'out': {'type': 'table', 'rows': [{'year': 2020, 'co2': 5}]}})" }, RealCustomLogicBlock));
        assert.equal(JSON.parse(subject(item).out).fileId, 'file-1');
        assert.equal(csv(), 'Year,CO2\r\n2020,5');
    });
});
