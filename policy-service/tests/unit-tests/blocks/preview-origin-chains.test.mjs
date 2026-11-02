import assert from 'node:assert/strict';
import { MessageResponse } from '@guardian/common/models/message-response';
import { AggregateVC } from '@guardian/common/entity/aggregate-documents';
import { makeBlock, makeDb, makeUser, restoreHarness } from './_block-exec-harness.mjs';
import { AggregateBlock } from '../../../dist/policy-engine/blocks/aggregate-block.js';
import { MathBlock } from '../../../dist/policy-engine/blocks/math-block.js';
import { SwitchBlock } from '../../../dist/policy-engine/blocks/switch-block.js';
import { ExtractDataBlock } from '../../../dist/policy-engine/blocks/extract-data-block.js';
import { CustomLogicBlock } from '../../../dist/policy-engine/blocks/custom-logic-block.js';
import { PolicyUtils } from '../../../dist/policy-engine/helpers/utils.js';
import { PolicyComponentsUtils } from '../../../dist/policy-engine/policy-components-utils.js';
import { RecordActionStep } from '../../../dist/policy-engine/record-action-step.js';
import { createPreviewDatabaseServer } from '../../../dist/policy-engine/helpers/preview-database.js';
import { runPreview } from '../../../dist/policy-engine/helpers/preview.js';

const user = makeUser();
const CHILD = { type: 'object', properties: { amount: { type: 'number' }, total: { type: 'number' } } };
const SCHEMAS = {
    '#S': { iri: '#S', name: 'Report', contextURL: 'schema:s', document: '{}' },
    '#Child': { iri: '#Child', uuid: 'Child', name: 'Child', contextURL: 'schema:child', document: JSON.stringify(CHILD) },
    '#Parent': { iri: '#Parent', uuid: 'Parent', name: 'Parent', contextURL: 'schema:parent', document: JSON.stringify({
        type: 'object', properties: { sections: { type: 'array', items: { $ref: '#Child' } } }, $defs: { '#Child': CHILD }
    }) }
};

function document(subject, schema = '#S') {
    return { owner: user.did, schema, document: PolicyUtils.createVcFromSubject(subject).toJsonTree() };
}

async function execute(block, state, step, allowNoOutput = false) {
    const outputs = [];
    block.triggerEvents = async (type, _user, data) => {
        if (type === 'RunEvent') outputs.push(data);
    };
    await block.runAction({ user, data: state, source: 'request', outputType: 'RunEvent', actionStatus: step });
    if (!allowNoOutput || outputs.length) assert.equal(outputs.length, 1);
    return outputs[0];
}

async function preview(subject, schema, paths, run) {
    return runPreview({ blockType: 'requestVcDocumentBlock' }, user, {}, async (_ref, _user, _state, step) => {
        step.setPreviewSource({ schema, document: subject, paths, dependencies: {} });
        await run(step);
        return new MessageResponse(null);
    });
}

function aggregateDatabase() {
    const old = { ...document({ amount: 5 }), _id: '6a0000000000000000000001', id: '6a0000000000000000000001' };
    let rows = [old];
    let writes = 0;
    const target = makeDb({
        find: async (entity) => entity === AggregateVC ? structuredClone(rows) : [],
        findOne: async () => null,
        save: async (_entity, row) => { writes++; rows.push(structuredClone(row)); return row; },
        remove: async () => { writes++; rows = []; },
        async createAggregateDocuments(row) { return this.save(AggregateVC, row); },
        async getAggregateDocuments() { return this.find(AggregateVC, {}); },
        async removeAggregateDocuments(items) { return this.remove(AggregateVC, items); }
    });
    return { target, writes: () => writes, rows: () => rows };
}

async function aggregate(input, step) {
    const fixture = aggregateDatabase();
    const { block } = makeBlock(AggregateBlock, {
        options: { aggregateType: 'cumulative', expressions: [], condition: 'true', disableUserGrouping: true, groupByFields: [] },
        componentsOverrides: { databaseServer: step.preview ? createPreviewDatabaseServer(fixture.target, null) : fixture.target }
    });
    const state = await execute(block, { data: document(input) }, step);
    assert.equal(state.data.length, 2);
    assert.equal(state.data[0].document.credentialSubject[0].amount, 5);
    assert.deepEqual(state.data[1].document.credentialSubject[0].amount, input.amount);
    if (step.preview) {
        assert.equal(fixture.writes(), 0);
        assert.equal(fixture.rows().length, 1);
    }
    return state;
}

async function aggregateMath(input, link, step) {
    const state = await aggregate(input, step);
    const original = PolicyUtils.findRelationships;
    PolicyUtils.findRelationships = async () => [state.data[0]];
    try {
        const { block } = makeBlock(MathBlock, { options: {
            inputSchema: '#S', outputSchema: '#S', unsigned: true,
            expression: {
                variables: [{ type: 'link', name: 'a', description: '', field: 'amount', schema: link }],
                formulas: [{ type: 'variable', name: 'b', body: 'a\\cdot2', description: '', params: [], relationships: [] }],
                outputs: [{ type: 'link', name: 'b', description: '', field: 'total', schema: '#S' }]
            }
        } });
        return (await execute(block, state, step)).data.map((item) => item.document.credentialSubject[0].total);
    } finally {
        PolicyUtils.findRelationships = original;
    }
}

async function aggregateSwitch(input, formula, step) {
    const state = await aggregate(input, step);
    const { block } = makeBlock(SwitchBlock, { options: {
        executionFlow: 'firstTrue', conditions: [{ type: 'equal', value: formula, tag: 'positive', actor: '' }]
    } });
    const branches = [];
    block.triggerEvents = async (type) => { branches.push(type); };
    await block.runAction({ user, data: state, actionStatus: step });
    return branches;
}

async function extract(action, state, step) {
    const { block } = makeBlock(ExtractDataBlock, { options: { schema: '#Child', action } });
    await block.beforeInit();
    return execute(block, state, step);
}

async function repeatedExtraction(subject, step) {
    const parent = document(subject, '#Parent');
    const state = await extract('get', { data: parent }, step);
    assert.equal(state.data.length, subject.sections.length);
    const merged = await extract('set', state, step);
    assert.equal(merged.data[0], parent);
    const again = await extract('get', merged, step);
    const expression = 'let total=0;for(const item of documents){total+=item.document.credentialSubject[0].amount*2}done({total});';
    const { block } = makeBlock(CustomLogicBlock, { options: { unsigned: true, expression } });
    const result = await execute(block, again, step, true);
    if (!result) return null;
    const item = Array.isArray(result.data) ? result.data[0] : result.data;
    return { total: item.document.credentialSubject[0].total, parent };
}

describe('@unit Preview origins through Aggregate and repeated extraction', function () {
    this.timeout(30000);
    const originals = [];
    const patch = (target, values) => {
        for (const [key, value] of Object.entries(values)) { originals.push([target, key, target[key]]); target[key] = value; }
    };
    before(() => {
        patch(PolicyComponentsUtils, { ExternalEventFn: async () => undefined, BlockErrorFn: async () => undefined });
        patch(PolicyUtils, { loadSchemaByID: async (_ref, iri) => SCHEMAS[iri] ?? null, getDocumentOwner: async () => user });
    });
    after(() => {
        for (const [target, key, value] of originals.reverse()) target[key] = value;
        restoreHarness();
    });

    it('Aggregate to Math reads its selected stored relationship and preserves ordinary results', async () => {
        let totals;
        const response = await preview({}, '#S', ['amount', 'total'], async (step) => { totals = await aggregateMath({}, '#S', step); });
        assert.equal(response.code, 200);
        assert.deepEqual(response.body.errors, []);
        assert.deepEqual(response.body.missingFields, []);
        assert.deepEqual(totals, [10, 10]);
        assert.deepEqual(await aggregateMath({}, '#S', new RecordActionStep(() => {})), totals);
    });

    it('Aggregate to Math requires the missing current value for a link without a schema', async () => {
        const response = await preview({}, '#S', ['amount', 'total'], (step) => aggregateMath({}, '', step));
        assert.equal(response.code, 422);
        assert.deepEqual(response.data.missingFields, ['amount']);
    });

    it('Aggregate to Math accepts current zero and matches ordinary per-document values', async () => {
        let totals;
        const response = await preview({ amount: 0 }, '#S', ['amount', 'total'], async (step) => { totals = await aggregateMath({ amount: 0 }, '', step); });
        assert.equal(response.code, 200);
        assert.deepEqual(response.body.errors, []);
        assert.deepEqual(totals, [10, 0]);
        assert.deepEqual(await aggregateMath({ amount: 0 }, '', new RecordActionStep(() => {})), totals);
    });

    it('Aggregate to Switch selects a stored element without requiring the empty current element', async () => {
        let branches;
        const response = await preview({}, '#S', ['amount'], async (step) => { branches = await aggregateSwitch({}, 'amount[1]>0', step); });
        assert.equal(response.code, 200);
        assert.deepEqual(response.body.errors, []);
        assert.deepEqual(response.body.fields, []);
        assert.ok(branches.includes('positive'));
        assert.deepEqual(await aggregateSwitch({}, 'amount[1]>0', new RecordActionStep(() => {})), branches);
    });

    it('Aggregate to Switch requires the selected missing current element', async () => {
        const response = await preview({}, '#S', ['amount'], (step) => aggregateSwitch({}, 'amount[2]>0', step));
        assert.equal(response.code, 422);
        assert.deepEqual(response.data.missingFields, ['amount']);
    });

    it('Aggregate to Switch accepts current zero and keeps its ordinary branch', async () => {
        let branches;
        const response = await preview({ amount: 0 }, '#S', ['amount'], async (step) => { branches = await aggregateSwitch({ amount: 0 }, 'amount[2]>=0', step); });
        assert.equal(response.code, 200);
        assert.deepEqual(response.body.errors, []);
        assert.ok(branches.includes('positive'));
        assert.deepEqual(await aggregateSwitch({ amount: 0 }, 'amount[2]>=0', new RecordActionStep(() => {})), branches);
    });

    it('Get to Set to Get keeps the original missing row path for its calculation', async () => {
        const input = { sections: [{ amount: 5 }, {}] };
        const response = await preview(input, '#Parent', ['sections', 'sections.amount', 'sections.total'], (step) => repeatedExtraction(input, step));
        assert.equal(response.code, 422);
        assert.deepEqual(response.data.missingFields, ['sections.1.amount']);
    });

    it('Get to Set to Get calculates filled rows including zero exactly as ordinary processing', async () => {
        const input = { sections: [{ amount: 5 }, { amount: 0 }] };
        let result;
        const response = await preview(input, '#Parent', ['sections', 'sections.amount', 'sections.total'], async (step) => { result = await repeatedExtraction(input, step); });
        assert.equal(response.code, 200);
        assert.deepEqual(response.body.errors, []);
        assert.equal(result.total, 10);
        const ordinary = await repeatedExtraction(input, new RecordActionStep(() => {}));
        assert.equal(ordinary.total, result.total);
    });
});
