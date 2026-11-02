import assert from 'node:assert/strict';
import { MessageResponse } from '@guardian/common/models/message-response';
import { AggregateVC } from '@guardian/common/entity/aggregate-documents';
import { makeBlock, makeDb, makeUser, restoreHarness } from './_block-exec-harness.mjs';
import { PolicyUtils } from '../../../dist/policy-engine/helpers/utils.js';
import { PolicyComponentsUtils } from '../../../dist/policy-engine/policy-components-utils.js';
import { RecordActionStep } from '../../../dist/policy-engine/record-action-step.js';
import { CustomLogicBlock } from '../../../dist/policy-engine/blocks/custom-logic-block.js';
import { MathBlock } from '../../../dist/policy-engine/blocks/math-block.js';
import { SwitchBlock } from '../../../dist/policy-engine/blocks/switch-block.js';
import { DocumentValidatorBlock } from '../../../dist/policy-engine/blocks/document-validator-block.js';
import { ExtractDataBlock } from '../../../dist/policy-engine/blocks/extract-data-block.js';
import { AggregateBlock } from '../../../dist/policy-engine/blocks/aggregate-block.js';
import { createPreviewDatabaseServer } from '../../../dist/policy-engine/helpers/preview-database.js';
import {
    getPreviewComputed,
    markPreviewStoredDocuments,
    runPreview,
    setPreviewComputed
} from '../../../dist/policy-engine/helpers/preview.js';

const CHILD = { type: 'object', properties: { amount: { type: 'number' }, total: { type: 'number' } } };
const SCHEMAS = {
    '#S': { iri: '#S', name: 'Report', contextURL: 'schema:s', document: '{}' },
    '#Child': { iri: '#Child', uuid: 'Child', name: 'Child', contextURL: 'schema:child', document: JSON.stringify(CHILD) },
    '#Parent': {
        iri: '#Parent', uuid: 'Parent', name: 'Parent', contextURL: 'schema:parent',
        document: JSON.stringify({
            type: 'object',
            properties: { section: { $ref: '#Child' }, sections: { type: 'array', items: { $ref: '#Child' } } },
            $defs: { '#Child': CHILD }
        })
    }
};

const user = makeUser();

function document(subject, schema = '#S') {
    const item = { owner: user.did, document: PolicyUtils.createVcFromSubject(subject).toJsonTree() };
    return schema ? { ...item, schema } : item;
}

function preview(source, run) {
    return runPreview({ blockType: 'requestVcDocumentBlock' }, user, {}, async (_ref, current, _data, step) => {
        step.setPreviewSource({ dependencies: {}, ...source });
        await run(current, step);
        return new MessageResponse(null);
    });
}

function customLogic(expression) {
    const { block } = makeBlock(CustomLogicBlock, { options: { unsigned: true, expression } });
    return block;
}

async function runCustomLogic(block, data, step) {
    const results = [];
    block.triggerEvents = async (type, _user, state) => {
        if (type === 'RunEvent') {
            results.push(state.data);
            step?.addPreviewDocument('script', null, state);
        }
    };
    await block.runAction({ user, data: { data }, actionStatus: step ?? new RecordActionStep(() => undefined) });
    return results;
}

function total(results) {
    const data = Array.isArray(results[0]) ? results[0][0] : results[0];
    return data.document.credentialSubject[0].total;
}

async function runSwitch(formula, data, step) {
    const { block } = makeBlock(SwitchBlock, { options: { executionFlow: 'firstTrue', conditions: [{ type: 'equal', value: formula, tag: 'positive', actor: '' }] } });
    const branches = [];
    block.triggerEvents = async (type) => { branches.push(type); };
    await block.runAction({ user, data: { data }, actionStatus: step ?? new RecordActionStep(() => undefined) });
    return branches;
}

describe('@unit Preview attributes reads to the document that supplied them', function () {
    this.timeout(30000);
    const originals = [];
    const patch = (target, values) => {
        for (const [key, value] of Object.entries(values)) {
            originals.push([target, key, target[key]]);
            target[key] = value;
        }
    };

    before(() => {
        patch(PolicyComponentsUtils, { ExternalEventFn: async () => undefined, BlockErrorFn: async () => undefined });
        patch(PolicyUtils, {
            loadSchemaByID: async (_ref, iri) => SCHEMAS[iri] ?? null,
            getDocumentOwner: async () => user
        });
    });

    after(() => {
        for (const [target, key, value] of originals.reverse()) {
            target[key] = value;
        }
        restoreHarness();
    });

    describe('Custom Logic', () => {
        const source = (document = {}, extra = {}) => ({ schema: '#S', document, paths: ['flag', 'amount', 'total'], ...extra });
        const SKIP_CURRENT = 'let total=0; for(const item of documents){const doc=item.document.credentialSubject[0]; if(!doc.flag){total+=doc.amount*2}} done({total});';

        it('asks for nothing when the field is read only from an older stored record', async () => {
            let results;
            const response = await preview(source(), async (_user, step) => {
                results = await runCustomLogic(customLogic('const doc=documents[0].document.credentialSubject[0]; done({total:doc.amount*2});'),
                    markPreviewStoredDocuments(document({ amount: 5 })), step);
            });
            assert.equal(response.code, 200);
            assert.equal(total(results), 10);
        });

        it('keeps the form field optional in a mixed array when only the stored record supplies it', async () => {
            let results;
            const response = await preview(source({ flag: true }), async (_user, step) => {
                results = await runCustomLogic(customLogic(SKIP_CURRENT), [document({ flag: true }), markPreviewStoredDocuments(document({ flag: false, amount: 5 }))], step);
            });
            assert.equal(response.code, 200);
            assert.equal(total(results), 10);
        });

        it('still asks for a form field the script reads from the current form in a mixed array', async () => {
            const response = await preview(source({ flag: false }), async (_user, step) => {
                await runCustomLogic(customLogic(SKIP_CURRENT), [document({ flag: false }), markPreviewStoredDocuments(document({ flag: false, amount: 5 }))], step);
            });
            assert.equal(response.code, 422);
            assert.deepEqual(response.data.missingFields, ['amount']);
        });

        it('counts zero and false from the current form as supplied', async () => {
            let results;
            const response = await preview(source({ flag: false, amount: 0 }), async (_user, step) => {
                results = await runCustomLogic(customLogic(SKIP_CURRENT), [document({ flag: false, amount: 0 }), markPreviewStoredDocuments(document({ flag: false, amount: 5 }))], step);
            });
            assert.equal(response.code, 200);
            assert.equal(total(results), 10);
        });

        it('checks calculated fields on the record that was read, not across every same-schema record', async () => {
            const read = (index) => `const doc=documents[${index}].document.credentialSubject[0]; done({total:doc.amount*2});`;
            for (const [index, code] of [[0, 200], [1, 422]]) {
                const response = await preview(source(), async (_user, step) => {
                    await runCustomLogic(customLogic(read(index)), [setPreviewComputed(document({ amount: 5 }), ['amount']), document({})], step)
                        .catch((error) => step.addError(error, 'customLogicBlock'));
                });
                assert.equal(response.code, code);
            }
        });

        it('lists only current-form inputs during discovery', async () => {
            for (const [stored, fields] of [[true, ['flag']], [false, ['amount', 'flag']]]) {
                const response = await preview(source({ flag: true }, { discovery: true }), async (_user, step) => {
                    const old = document({ flag: false, amount: 5 });
                    await runCustomLogic(customLogic(SKIP_CURRENT), [document({ flag: true }), stored ? markPreviewStoredDocuments(old) : old], step);
                });
                assert.equal(response.code, 200);
                assert.deepEqual(response.body.fields.filter((field) => field !== 'total'), fields);
            }
        });

        it('calculates the same value outside Preview', async () => {
            const results = await runCustomLogic(customLogic(SKIP_CURRENT), [document({ flag: true }), document({ flag: false, amount: 5 })]);
            assert.equal(total(results), 10);
        });
    });

    describe('Math', () => {
        const expression = (schema) => ({
            variables: [{ type: 'link', name: 'a', description: '', field: 'amount', schema }],
            formulas: [{ type: 'variable', name: 'b', body: 'a\\cdot2', description: '', params: [], relationships: [] }],
            outputs: [{ type: 'link', name: 'b', description: '', field: 'total', schema: '#S' }]
        });
        const run = async (schema, step, preview) => {
            const { block } = makeBlock(MathBlock, { options: { inputSchema: '#S', outputSchema: '#S', unsigned: true, expression: expression(schema) } });
            const old = document({ amount: 5 });
            const restore = PolicyUtils.findRelationships;
            PolicyUtils.findRelationships = async () => [preview ? markPreviewStoredDocuments(old) : old];
            try {
                return await block.process(document({}), block, 'uid', step?.id ?? null, user, [], preview);
            } finally {
                PolicyUtils.findRelationships = restore;
            }
        };

        it('follows an explicit same-schema link to the stored relationship it selects', async () => {
            let calculated;
            const response = await preview({ schema: '#S', document: {}, paths: ['amount', 'total'] }, async (_user, step) => {
                calculated = await run('#S', step, true);
            });
            assert.equal(response.code, 200);
            assert.equal(calculated.document.credentialSubject[0].total, 10);
            const ordinary = await run('#S', null, false);
            assert.deepEqual(ordinary.document.credentialSubject, calculated.document.credentialSubject);
        });

        it('still asks for the current-form field read through a link without a schema', async () => {
            const response = await preview({ schema: '#S', document: {}, paths: ['amount', 'total'] }, async (_user, step) => {
                await run('', step, true).catch((error) => step.addError(error, 'mathBlock'));
            });
            assert.equal(response.code, 422);
            assert.deepEqual(response.data.missingFields, ['amount']);
        });

        it('asks for nothing when its code reads a stored main document', async () => {
            const { block } = makeBlock(MathBlock);
            const ref = {
                tag: 'math', blockType: 'mathBlock', warn() {},
                getOptions: async () => ({ inputSchema: '#S', outputSchema: '#S', expression: { variables: [], formulas: [], outputs: [], code: 'result.total=document.amount*2;' } })
            };
            const { DocumentMap } = await import('../../../dist/policy-engine/helpers/math-model/index.js');
            const response = await preview({ schema: '#S', document: {}, paths: ['amount', 'total'] }, async () => {
                const map = new DocumentMap();
                map.addDocument({ schema: '#S', document: { amount: 5 } });
                const calculated = await block.calculate(ref, map, user, '#S', markPreviewStoredDocuments(document({ amount: 5 })));
                assert.equal(calculated.total, 10);
            });
            assert.equal(response.code, 200);
        });
    });

    describe('Switch', () => {
        const source = (document = {}) => ({ schema: '#S', document, paths: ['amount', 'total'] });

        it('asks for nothing when a formula selects only the stored element of a mixed array', async () => {
            let branches;
            const response = await preview(source(), async (_user, step) => {
                branches = await runSwitch('amount[1] > 0', [markPreviewStoredDocuments(document({ amount: 5 })), document({})], step);
            });
            assert.equal(response.code, 200);
            assert.ok(branches.includes('positive'));
        });

        it('asks for the current-form element a formula selects and accepts a supplied one', async () => {
            const missing = await preview(source(), async (_user, step) => {
                await runSwitch('amount[2] > 0', [markPreviewStoredDocuments(document({ amount: 5 })), document({})], step);
            });
            assert.equal(missing.code, 422);
            assert.deepEqual(missing.data.missingFields, ['amount']);
            let branches;
            const filled = await preview(source({ amount: 7 }), async (_user, step) => {
                branches = await runSwitch('amount[2] > 0', [markPreviewStoredDocuments(document({ amount: 5 })), document({ amount: 7 })], step);
            });
            assert.equal(filled.code, 200);
            assert.ok(branches.includes('positive'));
        });

        it('asks for the current-form value when a formula consumes the whole array', async () => {
            const response = await preview(source(), async (_user, step) => {
                await runSwitch('size(amount)[1] > 1', [markPreviewStoredDocuments(document({ amount: 5 })), document({})], step);
            });
            assert.equal(response.code, 422);
            assert.deepEqual(response.data.missingFields, ['amount']);
        });

        it('asks for nothing when its single document is a stored record', async () => {
            let branches;
            const response = await preview(source(), async (_user, step) => {
                branches = await runSwitch('amount > 0', markPreviewStoredDocuments(document({ amount: 5 })), step);
            });
            assert.equal(response.code, 200);
            assert.ok(branches.includes('positive'));
        });

        it('takes the same branches outside Preview', async () => {
            for (const formula of ['amount[1] > 0', 'amount[2] > 0']) {
                const expected = formula === 'amount[1] > 0';
                const branches = await runSwitch(formula, [document({ amount: 5 }), document({})]);
                assert.equal(branches.includes('positive'), expected);
            }
        });
    });

    describe('Document validator', () => {
        const source = (document = {}, extra = {}) => ({ schema: '#S', document, paths: ['amount', 'rate', 'projectId', 'limit'], ...extra });
        const validate = async (options, data, step, stubs = {}) => {
            const { block, db } = makeBlock(DocumentValidatorBlock, { options: { onErrorAction: 'no-action', ...options } });
            Object.assign(db, stubs);
            const events = [];
            block.triggerEvents = async (type) => { events.push(type); };
            await block.runAction({ user, data: { data }, actionStatus: step });
            return events;
        };
        const conditions = [
            { field: 'document.credentialSubject.0.amount', type: 'equal', value: 1, valueSource: 'value' },
            { field: 'document.credentialSubject.0.rate', type: 'equal', value: 2, valueSource: 'value' }
        ];

        it('does not ask for fields of checks after the first failure during discovery', async () => {
            const response = await preview(source({ amount: 0 }, { discovery: true }), async (_user, step) => {
                await validate({ conditions }, document({ amount: 0 }), step);
            });
            assert.equal(response.code, 200);
            assert.deepEqual(response.body.fields, ['amount']);
        });

        it('asks for a field a direct condition really reads from the current form', async () => {
            const response = await preview(source(), async (_user, step) => {
                await validate({ conditions: [{ field: 'document.credentialSubject.0.amount', type: 'equal', value: 'document.credentialSubject.0.rate', valueSource: 'document' }] }, document({}), step)
                    .catch(() => undefined);
            });
            assert.equal(response.code, 422);
            assert.deepEqual(response.data.missingFields, ['amount', 'rate']);
        });

        it('asks for query variables but not for conditions over an empty allowed source', async () => {
            const response = await preview(source({}, { discovery: true }), async (_user, step) => {
                await validate({
                    sourceValidations: [{
                        allowEmptySource: true,
                        filters: [{ field: 'document.credentialSubject.0.ref', type: 'equal', value: 'document.credentialSubject.0.projectId', typeValue: 'variable' }],
                        conditions: [{ field: 'document.credentialSubject.0.limit', fieldSource: 'document', type: 'equal', value: '5', valueSource: 'value' }]
                    }]
                }, document({}), step, { getVcDocuments: async () => [] });
            });
            assert.equal(response.code, 200);
            assert.deepEqual(response.body.fields, ['projectId']);
        });

        it('asks for a source-condition field read from the current form when the source has records', async () => {
            const response = await preview(source({}, { discovery: true }), async (_user, step) => {
                await validate({
                    sourceValidations: [{
                        conditions: [{ field: 'document.credentialSubject.0.limit', fieldSource: 'document', type: 'equal', value: '5', valueSource: 'value' }]
                    }]
                }, document({}), step, { getVcDocuments: async () => [document({ limit: 5 })] });
            });
            assert.deepEqual(response.body.fields, ['limit']);
        });

        it('reads conditions from the related stored document, not from the current form', async () => {
            let events;
            const response = await preview(source(), async (_user, step) => {
                events = await validate({ documentType: 'related-vc-document', conditions: [{ field: 'document.credentialSubject.0.amount', type: 'equal', value: '5' }] },
                    document({ ref: 'old-id' }), step, { getVcDocument: async () => markPreviewStoredDocuments(document({ amount: 5 })) });
            });
            assert.equal(response.code, 200);
            assert.equal(events[0], 'RunEvent');
        });

        it('keeps a document without a schema conservative and skips another schema and calculated fields', async () => {
            const read = [{ field: 'document.credentialSubject.0.amount', type: 'equal', value: 1, valueSource: 'value' }];
            const cases = [
                [document({}, null), ['amount']],
                [document({}, '#Other'), []],
                [setPreviewComputed(document({}), ['amount']), []]
            ];
            for (const [data, fields] of cases) {
                const response = await preview(source({}, { discovery: true }), async (_user, step) => {
                    await validate({ conditions: read }, data, step);
                });
                assert.deepEqual(response.body.fields, fields);
            }
        });

        it('still validates the same way outside Preview', async () => {
            const step = new RecordActionStep(() => undefined);
            const { block } = makeBlock(DocumentValidatorBlock, { options: { conditions } });
            assert.match((await block.run({ user, data: { data: document({ amount: 1 }) }, actionStatus: step })).message, /rate/);
            assert.equal(await block.run({ user, data: { data: document({ amount: 1, rate: 2 }) }, actionStatus: step }), null);
        });
    });

    describe('Extract Data', () => {
        const PATHS = ['section', 'section.amount', 'section.total', 'sections', 'sections.amount', 'sections.total'];
        const extract = async (schema = '#Child', action = 'get') => {
            const { block } = makeBlock(ExtractDataBlock, { options: { schema, action } });
            await block.beforeInit();
            return block;
        };
        const chain = async (input, next, extra = {}, parent = (subject) => document(subject, '#Parent')) => {
            let results = [];
            const response = await preview({ schema: '#Parent', document: input, paths: PATHS, ...extra }, async (current, step) => {
                const block = await extract();
                block.triggerEvents = async (type, _user, state) => {
                    if (type === 'RunEvent') {
                        results = await next(state, step);
                    }
                };
                await block.runAction({ user: current, data: { data: parent(input) }, actionStatus: step })
                    .catch((error) => step.addError(error, 'extractDataBlock'));
            });
            return { response, results };
        };
        const script = (state, step) => runCustomLogic(customLogic('const doc=documents[0].document.credentialSubject[0]; done({total:doc.amount*2});'), state.data, step)
            .catch((error) => { step.addError(error, 'customLogicBlock'); return []; });

        it('calculates from a filled extracted value and keeps zero as supplied', async () => {
            for (const [amount, expected] of [[5, 10], [0, 0]]) {
                const { response, results } = await chain({ section: { amount } }, script);
                assert.equal(response.code, 200);
                assert.equal(total(results), expected);
            }
        });

        it('asks for the original form path of an empty extracted value', async () => {
            const { response } = await chain({ section: {} }, script);
            assert.equal(response.code, 422);
            assert.deepEqual(response.data.missingFields, ['section.amount']);
        });

        it('lists the original form path during discovery', async () => {
            const { response } = await chain({ section: {} }, script, { discovery: true });
            assert.equal(response.code, 200);
            assert.ok(response.body.fields.includes('section.amount'));
        });

        it('names the exact row of an empty value extracted from a table of sections', async () => {
            const { response } = await chain({ sections: [{ amount: 1 }, {}] }, (state, step) => runCustomLogic(
                customLogic('let total=0; for(const item of documents){total+=item.document.credentialSubject[0].amount*2} done({total});'), state.data, step)
                .catch((error) => { step.addError(error, 'customLogicBlock'); return []; }));
            assert.equal(response.code, 422);
            assert.deepEqual(response.data.missingFields, ['sections.1.amount']);
        });

        it('does not ask for a value calculated before extraction or taken from a stored record', async () => {
            const calculated = (subject) => setPreviewComputed(document(subject, '#Parent'), ['section.amount']);
            const stored = (subject) => markPreviewStoredDocuments(document(subject, '#Parent'));
            for (const parent of [calculated, stored]) {
                const { response, results } = await chain({ section: { amount: 5 } }, script, {}, parent);
                assert.equal(response.code, 200);
                assert.equal(total(results), 10);
                assert.deepEqual(response.body.missingFields, []);
                assert.ok(!response.body.fields.includes('section.amount'));
            }
        });

        it('carries the original path into Switch and Math', async () => {
            const toSwitch = await chain({ section: {} }, async (state, step) => runSwitch('amount > 0', state.data, step));
            assert.equal(toSwitch.response.code, 422);
            assert.deepEqual(toSwitch.response.data.missingFields, ['section.amount']);
            const toMath = await chain({ section: {} }, async (state, step) => {
                const { block } = makeBlock(MathBlock, {
                    options: {
                        inputSchema: '#Child', outputSchema: '#Child', unsigned: true,
                        expression: {
                            variables: [{ type: 'link', name: 'a', description: '', field: 'amount', schema: '' }],
                            formulas: [{ type: 'variable', name: 'b', body: 'a\\cdot2', description: '', params: [], relationships: [] }],
                            outputs: [{ type: 'link', name: 'b', description: '', field: 'total', schema: '#Child' }]
                        }
                    }
                });
                const restore = PolicyUtils.findRelationships;
                PolicyUtils.findRelationships = async () => [];
                try {
                    await block.process(state.data[0], block, 'uid', step.id, user, [], true).catch((error) => step.addError(error, 'mathBlock'));
                } finally {
                    PolicyUtils.findRelationships = restore;
                }
                return [];
            });
            assert.equal(toMath.response.code, 422);
            assert.deepEqual(toMath.response.data.missingFields, ['section.amount']);
        });

        it('marks values merged back by Set as calculated on the original document', async () => {
            await preview({ schema: '#Parent', document: {}, paths: PATHS }, async (current, step) => {
                const parent = document({ section: { amount: 5 } }, '#Parent');
                const child = setPreviewComputed(document({ amount: 5, total: 10 }, null), ['total']);
                const block = await extract('#Child', 'set');
                let merged;
                block.triggerEvents = async (_type, _user, state) => { merged = state.data[0]; };
                await block.runAction({ user: current, data: { data: [child], source: [parent] }, actionStatus: step });
                assert.equal(merged, parent);
                assert.equal(parent.document.credentialSubject[0].section.total, 10);
                assert.deepEqual(getPreviewComputed(parent), ['section.total']);
            });
        });

        it('extracts the same subjects outside Preview', async () => {
            const block = await extract();
            let state;
            block.triggerEvents = async (_type, _user, data) => { state = data; };
            await block.runAction({ user, data: { data: document({ sections: [{ amount: 1 }, { amount: 2 }] }, '#Parent') }, actionStatus: new RecordActionStep(() => undefined) });
            assert.deepEqual(state.data.map((item) => item.document.credentialSubject[0].amount), [1, 2]);
        });
    });

    describe('Aggregate into a calculation', () => {
        it('takes a stored older record from cumulative Aggregate without asking for its field in the form', async () => {
            const old = { ...document({ flag: false, amount: 5 }), _id: '6a0000000000000000000001', id: '6a0000000000000000000001' };
            const target = makeDb({
                find: async (entityClass) => entityClass === AggregateVC ? [structuredClone(old)] : [],
                findOne: async () => null,
                save: async () => { throw new Error('must stay in the Preview database'); },
                remove: async () => { throw new Error('must stay in the Preview database'); },
                async createAggregateDocuments(item) { await this.save(AggregateVC, item); },
                async getAggregateDocuments() { return await this.find(AggregateVC, {}); },
                async removeAggregateDocuments(documents) { await this.remove(AggregateVC, documents); }
            });
            const databaseServer = createPreviewDatabaseServer(target, null);
            const { block } = makeBlock(AggregateBlock, {
                options: { aggregateType: 'cumulative', expressions: [], condition: 'true', disableUserGrouping: true, groupByFields: [] },
                componentsOverrides: { databaseServer }
            });
            const calculation = customLogic('let total=0; for(const item of documents){const doc=item.document.credentialSubject[0]; if(!doc.flag){total+=doc.amount*2}} done({total});');
            let results = [];
            const response = await preview({ schema: '#S', document: { flag: true }, paths: ['flag', 'amount', 'total'] }, async (current, step) => {
                block.triggerEvents = async (type, _user, state) => {
                    if (type === 'RunEvent') {
                        results = await runCustomLogic(calculation, state.data, step);
                    }
                };
                await block.runAction({ user: current, data: { data: document({ flag: true }) }, outputType: 'RunEvent', source: 'request', actionStatus: step });
            });
            assert.equal(response.code, 200);
            assert.equal(total(results), 10);
        });
    });
});
