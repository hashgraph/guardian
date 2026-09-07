import assert from 'node:assert/strict';
import { makeBlock, makeUser, restoreHarness } from './_block-exec-harness.mjs';
import { MathBlock } from '../../../dist/policy-engine/blocks/math-block.js';
import { DocumentMap } from '../../../dist/policy-engine/helpers/math-model/index.js';
import { PolicyUtils } from '../../../dist/policy-engine/helpers/utils.js';
import { DatabaseServer } from '@guardian/common';

const declaredTable = () => JSON.stringify({
    type: 'table',
    fileId: 'declared',
    columnNames: ['CO2 (tonnes)'],
    columnKeys: ['co2_tonnes']
});

const legacyTable = () => JSON.stringify({ type: 'table', fileId: 'legacy' });

const refWith = (options = {}) => ({
    blockType: 'mathBlock',
    uuid: 'uuid-1',
    getOptions: async () => ({
        expression: {},
        artifacts: [],
        inputSchema: '#in',
        outputSchema: '#out',
        ...options
    })
});

describe('@unit mathBlock table hydration', () => {
    let origLoadSchema;
    let origGetGridFile;
    let reads;

    beforeEach(() => {
        origLoadSchema = PolicyUtils.loadSchemaByID;
        origGetGridFile = DatabaseServer.getGridFile;
        reads = [];
        PolicyUtils.loadSchemaByID = async () => ({
            iri: '#out',
            name: 'Out',
            document: '{}',
            contextURL: 'ctx'
        });
        DatabaseServer.getGridFile = async (fileId) => {
            reads.push(fileId);
            return { buffer: Buffer.from('CO2 (tonnes)\n42\n45') };
        };
    });

    afterEach(() => {
        PolicyUtils.loadSchemaByID = origLoadSchema;
        DatabaseServer.getGridFile = origGetGridFile;
    });

    after(() => restoreHarness());

    function setup(document) {
        const map = new DocumentMap();
        map.addDocument({ schema: '#in', document });

        const { block } = makeBlock(MathBlock, { options: {} });
        let captured = null;
        block.createWorker = async (workerData) => {
            captured = workerData;
            return { done: true };
        };

        return { block, map, worker: () => captured };
    }

    it('sends the declared table to the worker under its declared key', async () => {
        const { block, map, worker } = setup({ field4: declaredTable() });

        await block.calculate(refWith(), map, makeUser());

        assert.deepEqual(worker().tablesPack, {
            declared: {
                columnKeys: ['co2_tonnes'],
                rows: [{ co2_tonnes: '42' }, { co2_tonnes: '45' }]
            }
        });
    });

    it('leaves the document payload the worker receives untouched', async () => {
        const original = declaredTable();
        const { block, map, worker } = setup({ field4: original });

        await block.calculate(refWith(), map, makeUser());

        assert.equal(worker().documents.target.field4, original);
        assert.equal(worker().documents.target.field4.rows, undefined);
    });

    it('does not read a table without the declaration marker', async () => {
        const { block, map, worker } = setup({
            field4: declaredTable(),
            field5: legacyTable()
        });

        await block.calculate(refWith(), map, makeUser());

        assert.deepEqual(reads, ['declared']);
        assert.deepEqual(Object.keys(worker().tablesPack), ['declared']);
    });

    it('reads no file at all when every table is unmarked', async () => {
        const { block, map, worker } = setup({ field5: legacyTable() });

        await block.calculate(refWith(), map, makeUser());

        assert.deepEqual(reads, []);
        assert.deepEqual(worker().tablesPack, {});
    });

    it('hydrates a declared table carried by a relationship document', async () => {
        const map = new DocumentMap();
        map.addDocument({ schema: '#in', document: { plain: 'value' } });
        map.addRelationships([{ schema: '#rel', document: { field4: declaredTable() } }]);

        const { block } = makeBlock(MathBlock, { options: {} });
        let captured = null;
        block.createWorker = async (workerData) => {
            captured = workerData;
            return { done: true };
        };

        await block.calculate(refWith(), map, makeUser());

        assert.deepEqual(reads, ['declared']);
        assert.deepEqual(captured.tablesPack.declared.columnKeys, ['co2_tonnes']);
    });
});
