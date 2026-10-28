import assert from 'node:assert/strict';
import { MessageResponse } from '@guardian/common/models/message-response';
import { AggregateVC } from '@guardian/common/entity/aggregate-documents';
import { SplitBlock } from '../../../dist/policy-engine/blocks/split-block.js';
import { AggregateBlock } from '../../../dist/policy-engine/blocks/aggregate-block.js';
import { MintBlock } from '../../../dist/policy-engine/blocks/mint-block.js';
import { RetirementBlock } from '../../../dist/policy-engine/blocks/retirement-block.js';
import { TokenOperationAddon } from '../../../dist/policy-engine/blocks/impact-addon.js';
import { PolicyUtils } from '../../../dist/policy-engine/helpers/utils.js';
import { PolicyComponentsUtils } from '../../../dist/policy-engine/policy-components-utils.js';
import { MintService } from '../../../dist/policy-engine/mint/mint-service.js';
import { RecordActionStep } from '../../../dist/policy-engine/record-action-step.js';
import { RequestVcDocumentBlock } from '../../../dist/policy-engine/blocks/request-vc-document-block.js';
import { createPreviewDatabaseServer } from '../../../dist/policy-engine/helpers/preview-database.js';
import {
    PreviewScope,
    addPreviewDocumentRead,
    evaluatePreviewFormula,
    getPreviewInputError,
    isPreviewStoredDocument,
    keepPreviewDocumentOrigins,
    markPreviewStoredDocuments,
    runPreview,
    setPreviewComputed,
    setPreviewDocumentSchema
} from '../../../dist/policy-engine/helpers/preview.js';
import { makeBlock, makeDb, makeUser, restoreHarness } from './_block-exec-harness.mjs';
import { createPreviewDocument } from '../helpers/preview-document-fixture.mjs';
import { installCredentialPreparation } from '../helpers/credential-preparation-stubs.mjs';

const PATHS = ['amount', 'flag', 'rate', 'fuel', 'group', 'temp', 'rows', 'rows.value', 'sum', 'pi', 'm'];

function previewStep(document, extra = {}) {
    const step = new RecordActionStep(() => undefined, 0, true, true, undefined, true);
    step.setPreviewSource({ schema: '#S', document, paths: PATHS, dependencies: {}, ...extra });
    return step;
}

function formDocument(subject) {
    return createPreviewDocument({ policyId: 'policy-1', tag: 'form' }, null, { type: 'Plot', ...subject }, '#S', 'did:user', null);
}

function evaluate(formula, scope, document, step = previewStep(scope)) {
    const result = PreviewScope.run(step, async () => evaluatePreviewFormula(formula, scope, document));
    return result.then((value) => ({ value, step, reads: step.getPreviewReads().map((read) => read.path), validation: getPreviewInputError(step) }));
}

function preview(input, run, extra = {}) {
    return runPreview({ blockType: 'requestVcDocumentBlock' }, makeUser(), { document: input }, async (_block, user, data, step) => {
        step.setPreviewSource({ schema: '#S', document: data.document, paths: PATHS, dependencies: {}, ...extra });
        await run(user, step);
        return new MessageResponse(null, 200);
    });
}

describe('@unit Preview reads configured in blocks', function () {
    this.timeout(20000);
    const originals = [];
    const patch = (target, values) => {
        for (const [key, value] of Object.entries(values)) {
            originals.push([target, key, target[key]]);
            target[key] = value;
        }
    };

    before(() => {
        patch(PolicyComponentsUtils, { GetBlockRef: (block) => block, ExternalEventFn: () => undefined });
    });

    after(() => {
        for (const [target, key, value] of originals.reverse()) {
            target[key] = value;
        }
        restoreHarness();
    });

    describe('evaluatePreviewFormula', () => {
        it('keeps the ordinary evaluation and records nothing outside Preview', () => {
            for (const scope of [{}, { amount: 4 }]) {
                assert.deepEqual(evaluatePreviewFormula('amount * 2', { ...scope }, formDocument(scope)),
                    PolicyUtils.evaluateFormula('amount * 2', { ...scope }));
            }
            assert.equal(PolicyUtils.aggregate('amount * 2', [PolicyUtils.createVcFromSubject({ amount: 4 })]), 8);
        });

        it('records only the branch the formula actually ran', async () => {
            for (const flag of [true, false]) {
                const scope = { flag, rate: 3, fuel: 7 };
                const out = await evaluate('flag ? rate : fuel', scope, formDocument(scope));
                assert.equal(out.value, flag ? 3 : 7);
                assert.deepEqual(out.reads, flag ? ['flag', 'rate'] : ['flag', 'fuel']);
                assert.equal(out.validation, null);
            }
            const missing = await evaluate('flag ? rate : fuel', { flag: true, fuel: 7 }, formDocument({ flag: true, fuel: 7 }));
            assert.deepEqual(missing.validation.data.missingFields, ['rate']);
            const inactive = await evaluate('flag ? rate : fuel', { flag: false, fuel: 7 }, formDocument({ flag: false, fuel: 7 }));
            assert.equal(inactive.validation, null);
        });

        it('requires an absent input, accepts zero and gives the ordinary value', async () => {
            const absent = await evaluate('amount * 2', {}, formDocument({}));
            assert.equal(absent.value, 'Incorrect formula');
            assert.equal(absent.validation.code, 422);
            assert.deepEqual(absent.validation.data.missingFields, ['amount']);
            for (const amount of [0, 5]) {
                const out = await evaluate('amount * 2', { amount }, formDocument({ amount }));
                assert.equal(out.value, amount * 2);
                assert.deepEqual(out.reads, ['amount']);
                assert.equal(out.validation, null);
            }
        });

        it('keeps an exact row path for a missing table cell', async () => {
            const scope = { rows: [{ value: 2 }, {}] };
            const out = await evaluate('rows[2].value * 2', scope, formDocument(scope));
            assert.deepEqual(out.validation.data.missingFields, ['rows.1.value']);
        });

        it('requires only the table row the formula read', async () => {
            const scope = { rows: [{ value: 5 }, {}] };
            const out = await evaluate('rows[1].value * 2', scope, formDocument(scope));
            assert.equal(out.value, 10);
            assert.deepEqual(out.reads, ['rows', 'rows.0.value']);
            assert.equal(out.validation, null);
        });

        it('does not require a table cell calculated earlier after the wrapper becomes a VcDocument', async () => {
            const wrapper = setPreviewComputed(formDocument({ rows: [{ value: 6 }] }), ['rows.0.value']);
            const step = previewStep({ rows: [{}] });
            const amount = await PreviewScope.run(step, async () => PolicyUtils.aggregate('rows[1].value * 2',
                [keepPreviewDocumentOrigins(wrapper, PolicyUtils.createVcFromSubject(wrapper.document.credentialSubject[0]))]));
            assert.equal(amount, 12);
            assert.deepEqual(step.getPreviewReads(), []);
            assert.equal(getPreviewInputError(step), null);
        });

        it('reports a non-finite result in a real Preview but not in discovery or ordinary processing', async () => {
            const documents = () => [keepPreviewDocumentOrigins(formDocument({ amount: 5 }), PolicyUtils.createVcFromSubject({ amount: 5 }))];
            await assert.rejects(PreviewScope.run(previewStep({ amount: 5 }), async () => PolicyUtils.aggregate('amount / 0', documents())), /non-finite/);
            assert.equal(await PreviewScope.run(previewStep({ amount: 5 }, { discovery: true }), async () => PolicyUtils.aggregate('amount / 0', documents())), Infinity);
            assert.equal(PolicyUtils.aggregate('amount / 0', [PolicyUtils.createVcFromSubject({ amount: 5 })]), Infinity);
        });

        it('does not require fields of a document read from the database, only within that Preview', async () => {
            const stored = formDocument({ rate: 9 });
            const step = previewStep({});
            await PreviewScope.run(step, async () => {
                markPreviewStoredDocuments(stored);
                const vc = keepPreviewDocumentOrigins(stored, PolicyUtils.createVcFromSubject(stored.document.credentialSubject[0]));
                assert.equal(PolicyUtils.aggregate('rate * 2', [vc]), 18);
                addPreviewDocumentRead(stored, 'document.credentialSubject.0.rate');
            });
            assert.deepEqual(step.getPreviewReads(), []);
            const other = previewStep({});
            await PreviewScope.run(other, async () => addPreviewDocumentRead(stored, 'document.credentialSubject.0.rate'));
            assert.deepEqual(other.getPreviewReads().map((read) => read.path), ['rate']);
            assert.deepEqual(Object.keys(stored).filter((key) => /preview/i.test(key)), []);
        });

        it('does not turn a value the formula assigned itself into an input', async () => {
            const out = await evaluate('temp = amount * 2; temp + 1', { amount: 5 }, formDocument({ amount: 5 }));
            assert.deepEqual(out.reads, ['amount']);
            assert.equal(out.validation, null);
        });

        it('keeps mathjs built-ins when the same-name field is absent and uses a supplied field', async () => {
            const sum = await evaluate('sum([1, 2])', {}, formDocument({}));
            assert.equal(sum.value, 3);
            const pi = await evaluate('pi * 2', {}, formDocument({}));
            assert.equal(pi.value, Math.PI * 2);
            const unit = await evaluate('2 * m', {}, formDocument({}));
            assert.equal(unit.value.toString(), '2 m');
            for (const out of [sum, pi, unit]) {
                assert.deepEqual(out.reads, []);
                assert.equal(out.validation, null);
            }
            const supplied = await evaluate('pi * 2', { pi: 5 }, formDocument({ pi: 5 }));
            assert.equal(supplied.value, 10);
            assert.deepEqual(supplied.reads, ['pi']);
        });

        it('does not require a value calculated earlier, even after the wrapper becomes a VcDocument', async () => {
            const wrapper = setPreviewComputed(formDocument({ temp: 6 }), ['temp']);
            const step = previewStep({});
            const out = await PreviewScope.run(step, async () => {
                const vc = keepPreviewDocumentOrigins(wrapper, PolicyUtils.createVcFromSubject(wrapper.document.credentialSubject[0]));
                return PolicyUtils.aggregate('temp * 2', [vc]);
            });
            assert.equal(out, 12);
            assert.deepEqual(step.getPreviewReads(), []);
            assert.equal(getPreviewInputError(step), null);
        });

        it('records nothing for a document of another schema or without known origin', async () => {
            const step = previewStep({});
            await PreviewScope.run(step, async () => {
                PolicyUtils.aggregate('amount * 2', [setPreviewDocumentSchema(PolicyUtils.createVcFromSubject({ amount: 1 }), '#Other'), PolicyUtils.createVcFromSubject({ amount: 1 })]);
            });
            assert.deepEqual(step.getPreviewReads(), []);
        });

        it('lets a form condition that forbids the field win', async () => {
            const out = await evaluate('amount * 2', {}, formDocument({}), previewStep({}, { unavailable: ['amount'] }));
            assert.equal(out.validation, null);
        });
    });

    describe('Split', () => {
        const run = async (subject, computed = []) => {
            const emitted = [];
            const { block } = makeBlock(SplitBlock, {
                options: { threshold: '10', sourceField: 'document.credentialSubject.0.amount' },
                componentsOverrides: {
                    generateUUID: async () => crypto.randomUUID(),
                    databaseServer: makeDb({
                        getResidue: async () => [],
                        createResidue: (policyId, blockId, userId, value, document) => ({ policyId, blockId, userId, value, document }),
                        removeResidue: async () => undefined,
                        setResidue: async () => undefined
                    })
                }
            });
            const restore = PolicyUtils.getUserCredentials;
            PolicyUtils.getUserCredentials = async () => ({});
            try {
                return await preview(computed.length ? {} : subject, async (user, step) => {
                    block.triggerEvents = async (type, _user, state) => {
                        if (type === 'RunEvent') {
                            emitted.push(state.data.map((item) => item.document.credentialSubject[0].amount));
                            step.addPreviewDocument('split', null, state);
                        }
                    };
                    const document = setPreviewComputed(formDocument(subject), computed);
                    await block.runAction({ user, data: { data: document }, actionStatus: step });
                }).then((response) => ({ response, emitted }));
            } finally {
                PolicyUtils.getUserCredentials = restore;
            }
        };

        it('asks for an empty source amount instead of inventing the threshold', async () => {
            const { response, emitted } = await run({});
            assert.equal(response.code, 422);
            assert.deepEqual(response.data.missingFields, ['amount']);
            assert.deepEqual(emitted, [[10]]);
            assert.equal(response.body, null);
        });

        it('keeps the ordinary split for zero, a valid amount and an earlier-calculated amount', async () => {
            for (const amount of [0, 5, 25]) {
                const { response } = await run({ amount });
                assert.equal(response.code, 200);
                assert.deepEqual(response.body.missingFields, []);
            }
            const { response } = await run({ amount: 25 }, ['amount']);
            assert.equal(response.code, 200);
            assert.deepEqual(response.body.fields, []);
        });
    });

    describe('cumulative Aggregate', () => {
        const run = async (subject, options = {}, extra = {}) => {
            const rows = [];
            const continued = [];
            const { block } = makeBlock(AggregateBlock, {
                options: {
                    aggregateType: 'cumulative',
                    expressions: [{ name: 'amounts', value: 'amount' }],
                    condition: 'sum(amounts) > 0',
                    disableUserGrouping: true,
                    groupByFields: [],
                    ...options
                },
                componentsOverrides: {
                    databaseServer: makeDb({
                        createAggregateDocuments: async (item) => rows.push(item),
                        getAggregateDocuments: async () => rows,
                        removeAggregateDocuments: async () => undefined
                    })
                }
            });
            const restore = PolicyUtils.getDocumentOwner;
            PolicyUtils.getDocumentOwner = async () => makeUser();
            try {
                const response = await preview(subject, async (user, step) => {
                    block.triggerEvents = async (type, _user, state) => {
                        if (type === 'RunEvent') {
                            continued.push(true);
                            step.addPreviewDocument('aggregate', null, state);
                        }
                    };
                    await block.runAction({ user, data: { data: formDocument(subject) }, outputType: 'RunEvent', source: 'request', actionStatus: step })
                        .catch((error) => step.addError(error, 'aggregateDocumentBlock'));
                }, extra);
                return { response, continued };
            } finally {
                PolicyUtils.getDocumentOwner = restore;
            }
        };

        it('asks for an empty expression input instead of presenting a wait', async () => {
            const { response, continued } = await run({});
            assert.equal(response.code, 422);
            assert.deepEqual(response.data.missingFields, ['amount']);
            assert.deepEqual(continued, []);
        });

        it('continues with a valid amount and waits on a genuine false without an error', async () => {
            const valid = await run({ amount: 5 });
            assert.equal(valid.response.code, 200);
            assert.deepEqual(valid.continued, [true]);
            assert.deepEqual(valid.response.body.errors, []);
            const zero = await run({ amount: 0 });
            assert.equal(zero.response.code, 200);
            assert.deepEqual(zero.continued, []);
            assert.deepEqual(zero.response.body.errors, []);
            assert.deepEqual(zero.response.body.missingFields, []);
        });

        it('reports a broken expression or condition as an error, not as a valid false', async () => {
            for (const options of [{ expressions: [{ name: 'amounts', value: 'amount *' }] }, { condition: 'sum(amounts) >' }]) {
                const { response, continued } = await run({ amount: 5 }, options);
                assert.equal(response.code, 200);
                assert.deepEqual(continued, []);
                assert.equal(response.body.errors.length, 1);
                assert.match(response.body.errors[0].message, /Incorrect formula/);
            }
        });

        it('keeps discovery running on a broken expression', async () => {
            const { response } = await run({ amount: 5 }, { expressions: [{ name: 'amounts', value: 'amount *' }] }, { discovery: true });
            assert.deepEqual(response.body.errors, []);
        });

        it('asks for an empty group-by field', async () => {
            const groupByFields = [{ fieldPath: 'document.credentialSubject.0.group' }];
            const empty = await run({ amount: 5 }, { groupByFields });
            assert.equal(empty.response.code, 422);
            assert.deepEqual(empty.response.data.missingFields, ['group']);
            const filled = await run({ amount: 5, group: 'A' }, { groupByFields });
            assert.equal(filled.response.code, 200);
        });
    });

    describe('cumulative Aggregate over the Preview database', () => {
        const run = async (subject, storedInput = false) => {
            const old = { ...JSON.parse(JSON.stringify(formDocument({ flag: false, rate: 9 }))), _id: '6a0000000000000000000001', id: '6a0000000000000000000001' };
            const target = makeDb({
                find: async (entityClass) => entityClass === AggregateVC ? [structuredClone(old)] : [],
                findOne: async () => null,
                save: async () => { throw new Error('must stay in the Preview database'); },
                remove: async () => { throw new Error('must stay in the Preview database'); },
                async createAggregateDocuments(item) { await this.save(AggregateVC, item); },
                async getAggregateDocuments() { return await this.find(AggregateVC, {}); },
                async removeAggregateDocuments(documents) { await this.remove(AggregateVC, documents); }
            });
            const continued = [];
            const databaseServer = createPreviewDatabaseServer(target, null);
            const { block } = makeBlock(AggregateBlock, {
                options: { aggregateType: 'cumulative', expressions: [{ name: 'amounts', value: 'flag ? amount : rate' }],
                    condition: 'sum(amounts) > 0', disableUserGrouping: true, groupByFields: [] },
                componentsOverrides: { databaseServer }
            });
            const restore = PolicyUtils.getDocumentOwner;
            PolicyUtils.getDocumentOwner = async () => makeUser();
            try {
                const response = await preview(subject, async (user, step) => {
                    block.triggerEvents = async (type, _user, state) => {
                        if (type === 'RunEvent') {
                            continued.push(state.data.length);
                            step.addPreviewDocument('aggregate', null, state);
                        }
                    };
                    const data = storedInput ? [formDocument(subject), ...await databaseServer.find(AggregateVC, {})] : formDocument(subject);
                    await block.runAction({ user, data: { data }, outputType: 'RunEvent', source: 'request', actionStatus: step })
                        .catch((error) => step.addError(error, 'aggregateDocumentBlock'));
                });
                return { response, continued };
            } finally {
                PolicyUtils.getDocumentOwner = restore;
            }
        };

        it('keeps an older stored record stored when it enters Aggregate itself and is copied, saved and re-read', async () => {
            const { response, continued } = await run({ flag: true, amount: 5 }, true);
            assert.equal(response.code, 200);
            assert.ok(continued.length > 0);
            assert.ok(!response.body.fields.includes('rate'));
            assert.deepEqual(response.body.errors, []);
        });

        it('keeps the stored mark through cloneVC and a temporary save and re-read, and the current form current', async () => {
            const old = { ...JSON.parse(JSON.stringify(formDocument({ rate: 9 }))), _id: '6a0000000000000000000002', id: '6a0000000000000000000002' };
            const target = makeDb({
                find: async () => [structuredClone(old)],
                findOne: async () => null,
                save: async () => { throw new Error('must stay in the Preview database'); },
                remove: async () => { throw new Error('must stay in the Preview database'); }
            });
            const databaseServer = createPreviewDatabaseServer(target, null);
            await PreviewScope.run(previewStep({}), async () => {
                const [stored] = await databaseServer.find(AggregateVC, {});
                assert.ok(isPreviewStoredDocument(stored));
                const clone = PolicyUtils.cloneVC({}, stored);
                assert.ok(isPreviewStoredDocument(clone));
                delete clone._id;
                delete clone.id;
                clone.sourceDocumentId = 'stored';
                const current = { ...formDocument({ amount: 5 }), sourceDocumentId: 'current' };
                await databaseServer.save(AggregateVC, clone);
                await databaseServer.save(AggregateVC, current);
                const reread = await databaseServer.find(AggregateVC, {});
                const bySource = (id) => reread.filter((item) => item.sourceDocumentId === id);
                assert.equal(bySource('stored').length, 1);
                assert.ok(isPreviewStoredDocument(bySource('stored')[0]));
                assert.equal(bySource('current').length, 1);
                assert.ok(!isPreviewStoredDocument(bySource('current')[0]));
            });
        });

        it('does not ask the current form for a field only an older stored record read', async () => {
            const { response, continued } = await run({ flag: true, amount: 5 });
            assert.equal(response.code, 200);
            assert.deepEqual(continued, [2]);
            assert.ok(!response.body.fields.includes('rate'));
            assert.deepEqual(response.body.errors, []);
        });

        it('keeps the current form current after the temporary save and re-read', async () => {
            const { response, continued } = await run({ flag: true });
            assert.equal(response.code, 422);
            assert.deepEqual(response.data.missingFields, ['amount']);
            assert.deepEqual(continued, []);
        });
    });

    describe('Request to Split through the real Request preparation', () => {
        it('asks for the empty Split source amount and splits a filled one', async () => {
            const restoreCredentials = installCredentialPreparation();
            const saved = [PolicyUtils.getRelationships, PolicyUtils.getRelayerAccountAndOwner, PolicyUtils.setGuardianVersion];
            PolicyUtils.getRelationships = async () => null;
            PolicyUtils.getRelayerAccountAndOwner = async (_ref, user) => ['0.0.1', user];
            PolicyUtils.setGuardianVersion = () => {};
            try {
                const outcome = async (document) => {
                    const { block: split } = makeBlock(SplitBlock, {
                        uuid: 'split-1',
                        options: { threshold: '10', sourceField: 'document.credentialSubject.0.amount' },
                        componentsOverrides: {
                            generateUUID: async () => crypto.randomUUID(),
                            databaseServer: makeDb({
                                getResidue: async () => [],
                                createResidue: (policyId, blockId, userId, value, item) => ({ policyId, blockId, userId, value, document: item }),
                                removeResidue: async () => undefined,
                                setResidue: async () => undefined
                            })
                        }
                    });
                    const { block: request } = makeBlock(RequestVcDocumentBlock, {
                        options: { schema: '#S' },
                        componentsOverrides: {
                            databaseServer: makeDb({ getTopic: async () => ({ topicId: '0.0.123' }) }),
                            generateUUID: async () => 'urn:uuid:request'
                        }
                    });
                    request._schema = { iri: '#S', type: 'TestType', contextURL: 'ctx://x', searchFields: () => [],
                        fields: [{ name: 'amount', type: 'number', isRef: false, isArray: false }] };
                    const emitted = [];
                    const response = await runPreview(request, makeUser(), { document }, async (target, user, data, step) => {
                        split.triggerEvents = async (type, _user, state) => {
                            if (type === 'RunEvent') {
                                emitted.push(state.data.map((item) => item.document.credentialSubject[0].amount));
                                step.addPreviewDocument('split', null, state);
                            }
                        };
                        target.triggerEvents = async (type, currentUser, state) => {
                            if (type === 'RunEvent') {
                                await split.runAction({ user: currentUser, data: state, actionStatus: step });
                            }
                        };
                        return new MessageResponse(await PreviewScope.run(step, () => target.setData(user, data, null, step)));
                    });
                    return { response, emitted };
                };
                const empty = await outcome({});
                assert.equal(empty.response.code, 422);
                assert.deepEqual(empty.response.data.missingFields, ['amount']);
                const filled = await outcome({ amount: 25 });
                assert.equal(filled.response.code, 200);
                assert.deepEqual(filled.response.body.missingFields, []);
                assert.deepEqual(filled.emitted, [[10], [10]]);
            } finally {
                [PolicyUtils.getRelationships, PolicyUtils.getRelayerAccountAndOwner, PolicyUtils.setGuardianVersion] = saved;
                restoreCredentials();
            }
        });
    });

    describe('Mint, Retirement and Impact', () => {
        const user = makeUser({ hederaAccountId: '0.0.1' });
        const credentials = {
            did: 'did:owner',
            location: 'local',
            hederaAccountId: '0.0.1',
            loadDidDocument: async () => ({ getDid: () => 'did:owner' }),
            loadHederaCredentials: async () => ({ hederaAccountId: '0.0.1', hederaAccountKey: 'local-stub' }),
            loadSignOptions: async () => ({})
        };
        let restoreCredentials;

        before(() => {
            restoreCredentials = installCredentialPreparation();
            patch(PolicyUtils, {
                getDocumentOwner: async () => user,
                getDocumentRelayerAccount: async () => '0.0.1',
                getUserCredentials: async () => credentials,
                loadSchemaByType: async () => ({ iri: '#Result', contextURL: 'schema:result' }),
                getPolicyTopic: async () => ({ topicId: '0.0.100' })
            });
            patch(MintService, { getMultipleConfig: async () => null, getTokenConfig: async () => ({ treasuryId: '0.0.3' }) });
        });

        after(() => restoreCredentials());

        const run = async (kind, subject, computed = [], rule = 'amount') => {
            const token = { tokenId: '0.0.9', tokenType: kind === 'retire-nft' ? 'non-fungible' : 'fungible', decimals: 0 };
            const Type = kind === 'mint' ? MintBlock : kind === 'impact' ? TokenOperationAddon : RetirementBlock;
            const writes = [];
            const { block } = makeBlock(Type, {
                options: { rule, amount: rule, accountType: 'default', serialNumbersExpression: rule },
                componentsOverrides: {
                    databaseServer: makeDb({
                        getToken: async () => token,
                        saveVC: async (item) => { writes.push(item); return item; },
                        saveVP: async (item) => { writes.push(item); return item; },
                        saveMintRequest: async () => undefined
                    }),
                    generateUUID: async () => crypto.randomUUID()
                }
            });
            block.getAddons = () => [];
            const source = setPreviewComputed(formDocument(subject), computed);
            source.topicId = '0.0.100';
            const response = await preview(computed.length ? {} : subject, async (currentUser, step) => {
                block.triggerEvents = async (type, _user, state) => {
                    if (type === 'RunEvent') {
                        step.addPreviewDocument(kind, null, { data: state.result ?? state.data });
                    }
                };
                if (kind === 'impact') {
                    const vc = keepPreviewDocumentOrigins(source, PolicyUtils.createVcFromSubject(source.document.credentialSubject[0]));
                    try {
                        const impact = await block.run([vc], credentials, currentUser, null);
                        step.addPreviewDocument(kind, null, { data: { document: impact.toJsonTree() } });
                    } catch (error) {
                        step.addError(error, 'impactAddon');
                    }
                } else {
                    await block.runAction({ user: currentUser, data: { data: source }, actionStatus: step });
                }
            });
            const stored = writes.flatMap((item) => item.document?.credentialSubject ?? []);
            const shown = (response.body?.documents ?? []).flatMap((item) => {
                const vc = item.document?.document;
                return vc?.credentialSubject ?? vc?.verifiableCredential?.flatMap((credential) => credential.credentialSubject ?? []) ?? [];
            }).filter((item) => item.type === 'Result');
            const amounts = kind === 'retire-ft' ? stored.map((item) => item.amount)
                : kind === 'retire-nft' ? stored.map((item) => item.serialNumbers).filter((value) => value !== undefined)
                    : shown.map((item) => item.amount);
            return Object.assign(response, { amounts });
        };

        for (const kind of ['mint', 'retire-ft', 'retire-nft', 'impact']) {
            it(`${kind}: an absent amount gives 422 with its path`, async () => {
                const response = await run(kind, {});
                assert.equal(response.code, 422);
                assert.deepEqual(response.data.missingFields, ['amount']);
            });

            it(`${kind}: a valid amount and an earlier-calculated amount keep the ordinary result`, async () => {
                const valid = await run(kind, { amount: 5 });
                assert.equal(valid.code, 200);
                assert.deepEqual(valid.body.errors, []);
                assert.deepEqual(valid.body.missingFields, []);
                assert.deepEqual(valid.amounts, ['5']);
                const computed = await run(kind, { amount: 5 }, ['amount']);
                assert.equal(computed.code, 200);
                assert.deepEqual(computed.body.fields, []);
                assert.deepEqual(computed.amounts, ['5']);
            });
        }

        for (const kind of ['retire-ft', 'impact', 'mint']) {
            it(`${kind}: a non-finite amount from complete input is an error, not a result`, async () => {
                const response = await run(kind, { amount: 5 }, [], 'amount / 0');
                assert.equal(response.code, 200);
                assert.deepEqual(response.body.missingFields, []);
                assert.equal(response.body.errors.length, 1);
                assert.match(response.body.errors[0].message, /non-finite/);
                assert.deepEqual(response.amounts.filter((value) => value === 'Infinity'), []);
            });
        }

        it('treats zero as supplied and keeps the ordinary NFT serial-number rule', async () => {
            for (const kind of ['mint', 'retire-ft', 'impact']) {
                const response = await run(kind, { amount: 0 });
                assert.equal(response.code, 200);
                assert.deepEqual(response.body.missingFields, []);
            }
            const nft = await run('retire-nft', { amount: 0 });
            assert.equal(nft.code, 200);
            assert.deepEqual(nft.body.missingFields, []);
            assert.match(nft.body.errors[0].message, /greater than or equal to 1/);
        });
    });
});
