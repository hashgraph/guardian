import assert from 'node:assert/strict';
import { makeBlock, makeUser, restoreHarness } from './_block-exec-harness.mjs';
import { MathBlock } from '../../../dist/policy-engine/blocks/math-block.js';
import { PolicyUtils } from '../../../dist/policy-engine/helpers/utils.js';
import { PolicyComponentsUtils } from '../../../dist/policy-engine/policy-components-utils.js';
import { DatabaseServer, IPFS, decodeGridFileText } from '@guardian/common';

const tableColumns = [
    { name: 'Year', key: 'year' },
    { name: 'CO2 (tonnes)', key: 'co2_tonnes' }
];

const outputSchemaDocument = (columns) => JSON.stringify({
    $id: '#out',
    title: 'Out',
    type: 'object',
    properties: {
        results: {
            title: 'results',
            description: 'Results',
            type: 'string',
            readOnly: false,
            $comment: JSON.stringify({ term: 'results', customType: 'table', tableColumns: columns })
        },
        total: {
            title: 'total',
            description: 'Total',
            type: 'number',
            readOnly: false,
            $comment: JSON.stringify({ term: 'total' })
        }
    },
    required: []
});

const expression = {
    variables: [],
    formulas: [],
    outputs: [{
        type: 'link',
        name: '',
        description: '',
        field: 'results',
        schema: '#out',
        rows: [{ year: 'y', co2_tonnes: 'c' }]
    }]
};

const refWith = (options = {}, dryRun = null) => ({
    blockType: 'mathBlock',
    uuid: 'uuid-1',
    dryRun,
    warnings: [],
    warn(message) { this.warnings.push(message); },
    getOptions: async () => ({
        expression,
        inputSchema: '#in',
        outputSchema: '#out',
        ...options
    })
});

describe('@unit mathBlock result tables', () => {
    let orig;
    let gridFiles;
    let ipfsFiles;
    let deletedGrid;
    let deletedCids;
    let columns;

    beforeEach(() => {
        orig = {
            loadSchemaByID: PolicyUtils.loadSchemaByID,
            upsertGridFile: DatabaseServer.upsertGridFile,
            deleteGridFile: DatabaseServer.deleteGridFile,
            addFile: IPFS.addFile,
            deleteCid: IPFS.deleteCid,
            blockErrorFn: PolicyComponentsUtils.BlockErrorFn,
            externalEventFn: PolicyComponentsUtils.ExternalEventFn
        };
        PolicyComponentsUtils.BlockErrorFn = async () => undefined;
        PolicyComponentsUtils.ExternalEventFn = async () => undefined;
        gridFiles = [];
        ipfsFiles = [];
        deletedGrid = [];
        deletedCids = [];
        columns = tableColumns;
        PolicyUtils.loadSchemaByID = async () => ({
            iri: '#out',
            name: 'Out',
            document: outputSchemaDocument(columns),
            contextURL: 'ctx'
        });
        DatabaseServer.upsertGridFile = async (params) => {
            gridFiles.push(params);
            return { fileId: `file-${gridFiles.length}`, filename: params.filename, contentType: params.contentType };
        };
        DatabaseServer.deleteGridFile = async (fileId) => {
            deletedGrid.push(fileId);
        };
        IPFS.addFile = async (buffer, options) => {
            ipfsFiles.push({ buffer, options });
            return { cid: `cid-${ipfsFiles.length}`, url: `ipfs://cid-${ipfsFiles.length}` };
        };
        IPFS.deleteCid = async (cid) => {
            deletedCids.push(cid);
            return true;
        };
    });

    afterEach(() => {
        PolicyUtils.loadSchemaByID = orig.loadSchemaByID;
        DatabaseServer.upsertGridFile = orig.upsertGridFile;
        DatabaseServer.deleteGridFile = orig.deleteGridFile;
        IPFS.addFile = orig.addFile;
        IPFS.deleteCid = orig.deleteCid;
        PolicyComponentsUtils.BlockErrorFn = orig.blockErrorFn;
        PolicyComponentsUtils.ExternalEventFn = orig.externalEventFn;
    });

    after(() => restoreHarness());

    const block = () => makeBlock(MathBlock, { options: { onErrorAction: 'no-action' } }).block;

    const workerResult = () => ({
        total: 3,
        results: { type: 'table', rows: [{ year: 2020, co2_tonnes: 42 }, { year: 2021, co2_tonnes: '' }] }
    });

    it('stores the result table in GridFS and IPFS and writes the browser reference', async () => {
        const json = workerResult();
        const stored = [];

        await block().storeResultTables(refWith(), json, 'user-1', stored);

        assert.equal(gridFiles.length, 1);
        assert.equal(gridFiles[0].contentType, 'application/gzip');
        assert.equal(
            await decodeGridFileText(gridFiles[0].buffer),
            'Year,CO2 (tonnes)\r\n2020,42\r\n2021,'
        );
        assert.equal(ipfsFiles.length, 1);
        assert.equal(ipfsFiles[0].buffer, gridFiles[0].buffer);
        assert.equal(ipfsFiles[0].options.userId, 'user-1');
        assert.deepEqual(JSON.parse(json.results), {
            type: 'table',
            fileId: 'file-1',
            cid: 'cid-1',
            columnNames: ['Year', 'CO2 (tonnes)'],
            columnKeys: ['year', 'co2_tonnes']
        });
        assert.equal(json.total, 3);
        assert.deepEqual(stored, [{ fileId: 'file-1', cid: 'cid-1' }]);
    });

    it('stores the file in GridFS only in Dry Run', async () => {
        const json = workerResult();
        const stored = [];

        await block().storeResultTables(refWith({}, 'dry-run-policy'), json, 'user-1', stored);

        assert.equal(gridFiles.length, 1);
        assert.equal(ipfsFiles.length, 0);
        assert.equal(JSON.parse(json.results).cid, undefined);
        assert.deepEqual(stored, [{ fileId: 'file-1', cid: null }]);
    });

    it('leaves a field that Advanced code replaced with something else untouched', async () => {
        const json = { results: 'set by code' };

        await block().storeResultTables(refWith(), json, 'user-1', []);

        assert.equal(json.results, 'set by code');
        assert.equal(gridFiles.length, 0);
    });

    it('does nothing when the block has no table output', async () => {
        const json = { total: 3 };
        let schemaLoads = 0;
        PolicyUtils.loadSchemaByID = async () => {
            schemaLoads++;
            return null;
        };

        await block().storeResultTables(refWith({ expression: { outputs: [] } }), json, 'user-1', []);

        assert.equal(schemaLoads, 0);
        assert.deepEqual(json, { total: 3 });
    });

    it('rejects a table output whose field declares no columns', async () => {
        columns = undefined;

        await assert.rejects(
            () => block().storeResultTables(refWith(), workerResult(), 'user-1', []),
            /Table output "results" has no declared columns/
        );
        assert.equal(gridFiles.length, 0);
    });

    it('keeps a GridFS file in the list even when the IPFS upload fails', async () => {
        const stored = [];
        IPFS.addFile = async () => {
            throw new Error('ipfs down');
        };

        await assert.rejects(
            () => block().storeResultTables(refWith(), workerResult(), 'user-1', stored),
            /ipfs down/
        );
        assert.deepEqual(stored, [{ fileId: 'file-1', cid: null }]);
    });

    it('deletes every stored file when the run fails after storing', async () => {
        const mathBlock = makeBlock(MathBlock, { options: { onErrorAction: 'debug' } }).block;
        mathBlock.triggerEvents = async () => undefined;
        let file = 0;
        mathBlock.process = async (doc, ref, userId, recordActionId, user, storedTables) => {
            file++;
            storedTables.push({ fileId: `file-${file}`, cid: `cid-${file}` });
            if (doc.fail) {
                throw new Error('document creation failed');
            }
            return doc;
        };

        await mathBlock.runAction({
            data: { data: [{ fail: false }, { fail: true }] },
            user: makeUser({ userId: 'user-1' }),
            actionStatus: {}
        });

        assert.deepEqual(deletedCids, ['cid-1', 'cid-2']);
        assert.deepEqual(deletedGrid, ['file-1', 'file-2']);
    });

    const listSchema = () => ({
        iri: '#out',
        name: 'Out',
        contextURL: 'ctx',
        document: JSON.stringify({
            $id: '#out',
            title: 'Out',
            type: 'object',
            properties: {
                series: {
                    title: 'series',
                    description: 'Series',
                    type: 'array',
                    items: { type: 'string' },
                    readOnly: false,
                    $comment: JSON.stringify({ term: 'series', customType: 'table', tableColumns })
                },
                sites: {
                    title: 'sites',
                    description: 'Sites',
                    type: 'array',
                    items: { $ref: '#site' },
                    readOnly: false,
                    $comment: JSON.stringify({ term: 'sites' })
                }
            },
            required: [],
            $defs: {
                '#site': {
                    $id: '#site',
                    title: 'Site',
                    type: 'object',
                    properties: {
                        name: {
                            title: 'name',
                            description: 'Name',
                            type: 'string',
                            readOnly: false,
                            $comment: JSON.stringify({ term: 'name' })
                        },
                        results: {
                            title: 'results',
                            description: 'Results',
                            type: 'string',
                            readOnly: false,
                            $comment: JSON.stringify({ term: 'results', customType: 'table', tableColumns })
                        }
                    },
                    required: []
                }
            }
        })
    });

    const listExpression = (field) => ({
        variables: [],
        formulas: [],
        outputs: [{
            type: 'link',
            name: '',
            description: '',
            field,
            schema: '#out',
            tables: [[{ year: 'y', co2_tonnes: 'c' }], [{ year: 'y2', co2_tonnes: '' }]]
        }]
    });

    const tableValue = (year, co2) => ({ type: 'table', rows: [{ year, co2_tonnes: co2 }] });

    it('stores one file per table of a Table field with multiple answers', async () => {
        PolicyUtils.loadSchemaByID = async () => listSchema();
        const json = { series: [tableValue(2020, 42), tableValue(2021, '')] };
        const stored = [];

        await block().storeResultTables(refWith({ expression: listExpression('series') }), json, 'user-1', stored);

        assert.equal(gridFiles.length, 2);
        assert.equal(await decodeGridFileText(gridFiles[1].buffer), 'Year,CO2 (tonnes)\r\n2021,');
        assert.deepEqual(json.series.map((value) => JSON.parse(value).fileId), ['file-1', 'file-2']);
        assert.deepEqual(json.series.map((value) => JSON.parse(value).cid), ['cid-1', 'cid-2']);
        assert.deepEqual(stored, [{ fileId: 'file-1', cid: 'cid-1' }, { fileId: 'file-2', cid: 'cid-2' }]);
    });

    it('stores table N into entry N of a repeated sub-schema and keeps the other fields', async () => {
        PolicyUtils.loadSchemaByID = async () => listSchema();
        const json = {
            sites: [
                { name: 'A', results: tableValue(2020, 42) },
                { name: 'B', results: tableValue(2021, 7) }
            ]
        };

        await block().storeResultTables(refWith({ expression: listExpression('sites.results') }), json, 'user-1', []);

        assert.deepEqual(json.sites.map((site) => site.name), ['A', 'B']);
        assert.deepEqual(json.sites.map((site) => JSON.parse(site.results).fileId), ['file-1', 'file-2']);
        assert.equal(await decodeGridFileText(gridFiles[1].buffer), 'Year,CO2 (tonnes)\r\n2021,7');
    });

    it('keeps an entry of a table list that Advanced code replaced', async () => {
        PolicyUtils.loadSchemaByID = async () => listSchema();
        const json = { series: [tableValue(2020, 42), 'set by code'] };

        await block().storeResultTables(refWith({ expression: listExpression('series') }), json, 'user-1', []);

        assert.equal(gridFiles.length, 1);
        assert.equal(JSON.parse(json.series[0]).fileId, 'file-1');
        assert.equal(json.series[1], 'set by code');
    });

    it('keeps the files of a run that succeeded', async () => {
        const mathBlock = block();
        mathBlock.triggerEvents = async () => undefined;
        mathBlock.backup = () => undefined;
        mathBlock.process = async (doc, ref, userId, recordActionId, user, storedTables) => {
            storedTables.push({ fileId: 'file-a', cid: 'cid-a' });
            return doc;
        };

        await mathBlock.runAction({
            data: { data: { fail: false } },
            user: makeUser({ userId: 'user-1' }),
            actionStatus: {}
        });

        assert.deepEqual(deletedCids, []);
        assert.deepEqual(deletedGrid, []);
    });
});
