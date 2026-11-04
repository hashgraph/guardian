import esmock from 'esmock';
import { PolicyLink } from '../../../dist/policy-engine/interfaces/policy-event.js';
import { EventActor } from '../../../dist/policy-engine/interfaces/policy-event-type.js';
import { AggregateVC } from '@guardian/common/entity/aggregate-documents';
import { AggregateBlock } from '../../../dist/policy-engine/blocks/aggregate-block.js';
import { MultiSignBlock } from '../../../dist/policy-engine/blocks/multi-sign-block.js';
import { TokenConfirmationBlock } from '../../../dist/policy-engine/blocks/token-confirmation-block.js';
import { createInMemoryDatabaseHelper } from '../helpers/in-memory-database-helper.mjs';
import { createPreviewDatabaseServer } from '../../../dist/policy-engine/helpers/preview-database.js';
import { PolicyUtils } from '../../../dist/policy-engine/helpers/utils.js';
import { createPreviewDocument } from '../helpers/preview-document-fixture.mjs';
import { makeBlock, makeComponents, restoreHarness } from './_block-exec-harness.mjs';
import assert from 'node:assert/strict';
import { FiltersAddonBlock } from '../../../dist/policy-engine/blocks/filters-addon-block.js';
import { TimerBlock } from '../../../dist/policy-engine/blocks/timer-block.js';
import { CreateTokenBlock } from '../../../dist/policy-engine/blocks/create-token-block.js';
import { PolicyComponentsUtils } from '../../../dist/policy-engine/policy-components-utils.js';
import { PreviewScope } from '../../../dist/policy-engine/helpers/preview.js';
import { RecordActionStep } from '../../../dist/policy-engine/record-action-step.js';

const aggregateDb = createInMemoryDatabaseHelper();
const { DatabaseServer: AggregateDatabaseServer } = await esmock('@guardian/common/database-modules/database-server', {
    '@guardian/common/helpers/db-helper': { DataBaseHelper: aggregateDb.DataBaseHelper }
});

const previewStep = () => new RecordActionStep(() => undefined, 0, true, true, undefined, true);
const user = { id: 'u1', userId: 'uid1', did: 'did:u1' };

describe('@unit block memory state in a preview', () => {
    const origGetRef = PolicyComponentsUtils.GetBlockRef;
    const origExternal = PolicyComponentsUtils.ExternalEventFn;

    afterEach(() => {
        PolicyComponentsUtils.GetBlockRef = origGetRef;
        PolicyComponentsUtils.ExternalEventFn = origExternal;
    });

    describe('filters add-on', () => {
        const getFilters = Object.getPrototypeOf(FiltersAddonBlock.prototype).getFilters;

        const setup = () => {
            const block = Object.create(FiltersAddonBlock.prototype);
            block.state = {};
            const ref = {
                uuid: 'flt',
                blockType: 'filtersAddon',
                filters: { [user.id]: { other: { $eq: 'x' } } },
                async getOptions() {
                    return { type: 'dropdown', field: 'colour', queryType: 'equal', optionValue: 'colour' };
                },
                async getSources() {
                    return [{ colour: 'red' }];
                }
            };
            PolicyComponentsUtils.GetBlockRef = () => ref;
            return { block, ref };
        };

        it('builds the same filters in a preview without changing the stored filters or the block state', async () => {
            const { block, ref } = setup();
            const filters = await PreviewScope.run(previewStep(), () => getFilters.call(block, user));
            assert.deepEqual(filters, { other: { $eq: 'x' }, colour: { $eq: 'red' } });
            assert.deepEqual(ref.filters[user.id], { other: { $eq: 'x' } });
            assert.deepEqual(block.state, {});
        });

        it('keeps the first selected default across later reads in the same preview', async () => {
            const { block, ref } = setup();
            let colour = 'red';
            ref.getSources = async () => [{ colour }];
            const step = previewStep();
            const result = await PreviewScope.run(step, async () => {
                const first = structuredClone(await getFilters.call(block, user));
                colour = 'blue';
                return [first, await getFilters.call(block, user)];
            });
            assert.equal(result[0].colour.$eq, 'red');
            assert.equal(result[1].colour.$eq, 'red');
            assert.deepEqual(ref.filters[user.id], { other: { $eq: 'x' } });
            const other = await PreviewScope.run(previewStep(), () => getFilters.call(block, user));
            assert.equal(other.colour.$eq, 'blue');
            assert.deepEqual(block.state, {});
        });

        it('keeps the normal behaviour outside a preview', async () => {
            const { block, ref } = setup();
            const filters = await getFilters.call(block, user);
            assert.deepEqual(filters, { other: { $eq: 'x' }, colour: { $eq: 'red' } });
            assert.deepEqual(ref.filters[user.id], { other: { $eq: 'x' }, colour: { $eq: 'red' } });
            assert.equal(block.state[user.id].lastValue, 'red');
        });
    });

    describe('timer', () => {
        const runAction = Object.getPrototypeOf(TimerBlock.prototype).runAction;

        const setup = () => {
            const block = Object.create(TimerBlock.prototype);
            block.state = {};
            const fired = [];
            PolicyComponentsUtils.GetBlockRef = () => ({
                uuid: 'tm',
                blockType: 'timerBlock',
                async getOptions() { return {}; },
                async triggerEvents(type, eventUser, data) { fired.push({ type, data }); },
                async saveState() {},
                log() {},
                backup() {}
            });
            PolicyComponentsUtils.ExternalEventFn = () => {};
            return { block, fired };
        };

        it('passes the document on in a preview without starting the schedule', async () => {
            const { block, fired } = setup();
            const step = previewStep();
            await runAction.call(block, { user, data: { data: { id: 'd1', owner: 'did:u1' } }, actionStatus: step });
            assert.deepEqual(block.state, {});
            assert.deepEqual(fired[0], { type: 'RunEvent', data: { data: { id: 'd1', owner: 'did:u1' } } });
        });

        it('starts the schedule for the user outside a preview', async () => {
            const { block } = setup();
            await runAction.call(block, { user, data: { data: { id: 'd1', owner: 'did:u1' } } });
            assert.deepEqual(block.state, { 'did:u1': true });
        });
    });

    describe('create token with autorun', () => {
        let owner = Object.getPrototypeOf(CreateTokenBlock.prototype);
        while (!Object.prototype.hasOwnProperty.call(owner, 'runAction') || String(owner.runAction).includes('DISCONTINUED')) {
            owner = Object.getPrototypeOf(owner);
        }
        const runAction = owner.runAction;

        const setup = (tokenNumber) => {
            const block = Object.create(CreateTokenBlock.prototype);
            block.state = { tokenNumber };
            const indexes = [];
            block._prepareTokenTemplate = (ref, template, data) => data;
            block._createToken = async (eventUser, ref, template) => { indexes.push(template.index); };
            PolicyComponentsUtils.GetBlockRef = () => ({
                uuid: 'ct',
                blockType: 'createTokenBlock',
                components: { getTokenTemplate: () => ({}) },
                async getOptions() { return { autorun: true, template: 't' }; },
                async saveState() {},
                log() {},
                backup() {}
            });
            PolicyComponentsUtils.ExternalEventFn = () => {};
            return { block, indexes };
        };

        const run = (block, actionStatus) => runAction.call(block, { user, data: { data: {} }, actionStatus });

        it('numbers tokens in a preview from the real counter, without changing it', async () => {
            const { block, indexes } = setup(4);
            const step = previewStep();
            await run(block, step);
            await run(block, step);
            assert.deepEqual(indexes, [5, 6]);
            assert.equal(block.state.tokenNumber, 4);
        });

        it('keeps two previews and a normal submit apart', async () => {
            const { block, indexes } = setup(4);
            const first = previewStep();
            const second = previewStep();
            await run(block, first);
            await run(block);
            await run(block, second);
            await run(block, first);
            assert.deepEqual(indexes, [5, 5, 6, 6]);
            assert.equal(block.state.tokenNumber, 5);
        });
    });
});

describe('@unit block-owned waiting', () => {
    const originalOwner = PolicyUtils.getDocumentOwner;
    const originalRelayer = PolicyUtils.getDocumentRelayerAccount;
    const originalRef = PolicyComponentsUtils.GetBlockRef;
    const originalExternal = PolicyComponentsUtils.ExternalEventFn;
    const document = area => createPreviewDocument(
        { policyId: 'policy-1', tag: 'form' }, user, { type: 'Plot', area }, '#S', user.did, null);

    beforeEach(() => {
        aggregateDb.reset();
        PolicyUtils.getDocumentOwner = async () => user;
        PolicyComponentsUtils.ExternalEventFn = () => {};
    });
    afterEach(() => {
        PolicyUtils.getDocumentOwner = originalOwner;
        PolicyUtils.getDocumentRelayerAccount = originalRelayer;
        PolicyComponentsUtils.GetBlockRef = originalRef;
        PolicyComponentsUtils.ExternalEventFn = originalExternal;
        restoreHarness();
    });

    it('executes Token Confirmation preparation errors instead of returning its input as a successful waiting result', async () => {
        const { block } = makeBlock(TokenConfirmationBlock, { tag: 'confirmation', options: {} });
        block.state = {};
        PolicyUtils.getDocumentRelayerAccount = async () => { throw new Error('Account preparation failed'); };
        const source = { tag: 'form', uuid: 'form', policyId: 'policy-1' };
        source.sourceLinks = [new PolicyLink('RunEvent', 'RunEvent', source, block,
            EventActor.EventInitiator, event => block.runAction(event))];
        const step = previewStep();
        await PreviewScope.run(step, () => block.triggerEvents.call(source, 'RunEvent', user,
            { data: { id: 'document-1' } }, step));
        assert.deepEqual(step.getPreviewDocuments(), []);
        assert.deepEqual(block.state, {});
        assert.equal(step.getErrors().length, 1);
        assert.match(step.getErrors()[0].message, /Account preparation failed/);
    });

    for (const preview of [false, true]) {
        for (const aggregateType of ['cumulative', 'period']) {
            for (const enough of [false, true]) {
                it(`uses the real Aggregate condition for preview=${preview}, type=${aggregateType}, ready=${enough}`, async () => {
                    const server = createPreviewDatabaseServer(new AggregateDatabaseServer(null), null);
                    const { block } = makeBlock(AggregateBlock, {
                        uuid: 'aggregate', tag: 'aggregate',
                        options: { aggregateType, expressions: [{ name: 'area', value: 'area' }], condition: 'sum(area) >= 10' },
                        components: makeComponents({ databaseServer: server })
                    });
                    const outputs = [];
                    const trigger = block.triggerEvents.bind(block);
                    block.sourceLinks = [];
                    block.triggerEvents = async (type, ...args) => {
                        outputs.push(type);
                        return trigger(type, ...args);
                    };
                    const step = new RecordActionStep(() => {}, 0, true, true, undefined, preview);
                    const item = document(enough ? 10 : 3);
                    const event = { source: 'form', outputType: 'RunEvent', user, data: { data: item }, actionStatus: step };
                    const execute = () => block.runAction(event);
                    if (preview) await PreviewScope.run(step, execute);
                    else await execute();
                    const continued = aggregateType === 'cumulative' && enough;
                    assert.equal(outputs.includes('RunEvent'), continued);
                    if (preview) {
                        const results = step.getPreviewDocuments();
                        assert.equal(results.length, 1);
                        assert.equal(results[0].target, continued ? null : 'aggregate');
                        const value = continued ? results[0].document[0] : results[0].document;
                        assert.equal(value.document.credentialSubject[0].area, enough ? 10 : 3);
                        assert.equal(aggregateDb.calls.some(([name]) => ['save', 'remove', 'update'].includes(name)), false);
                        assert.deepEqual(aggregateDb.records(AggregateVC), []);
                    } else {
                        assert.deepEqual(step.getPreviewDocuments(), []);
                        assert.equal(aggregateDb.records(AggregateVC).length, continued ? 0 : 1);
                    }
                });
            }
        }
    }

    it('retains a pending aggregate and later continues when the actual cumulative condition passes', async () => {
        const server = createPreviewDatabaseServer(new AggregateDatabaseServer(null), null);
        const { block } = makeBlock(AggregateBlock, {
            uuid: 'aggregate', tag: 'aggregate',
            options: { aggregateType: 'cumulative', expressions: [{ name: 'area', value: 'area' }], condition: 'sum(area) >= 10' },
            components: makeComponents({ databaseServer: server })
        });
        const step = previewStep();
        const first = document(3);
        const second = document(10);
        await PreviewScope.run(step, async () => {
            await block.runAction({ source: 'form', outputType: 'RunEvent', user, data: { data: first }, actionStatus: step });
            assert.equal((await server.getAggregateDocuments('policy-1', 'aggregate')).length, 1);
            await block.runAction({ source: 'form', outputType: 'RunEvent', user, data: { data: second }, actionStatus: step });
            assert.equal((await server.getAggregateDocuments('policy-1', 'aggregate')).length, 0);
        });
        assert.deepEqual(step.getPreviewDocuments().map(item => item.target), ['aggregate', null]);
        assert.equal(step.getPreviewDocuments()[1].document.length, 2);
        assert.deepEqual(aggregateDb.records(AggregateVC), []);
    });

    for (const preview of [false, true]) {
        it(`lets MultiSign handle its incoming event with preview=${preview}`, async () => {
            const { block } = makeBlock(MultiSignBlock, { tag: 'signatures' });
            const step = new RecordActionStep(() => {}, 0, true, true, undefined, preview);
            const data = { data: { id: 'document-1' } };
            await block.runAction({ source: 'form', outputType: 'RunEvent', user, data, actionStatus: step });
            assert.deepEqual(step.getPreviewDocuments(), preview ? [
                { source: 'form', target: 'signatures', blockType: 'multiSignBlock', document: data.data }
            ] : []);
        });

        it(`prepares Token Confirmation before waiting, with preview=${preview}`, async () => {
            const { block } = makeBlock(TokenConfirmationBlock, { tag: 'confirmation', options: { accountId: 'default' } });
            block.state = {};
            block.saveState = async () => {};
            block.backup = () => {};
            const step = new RecordActionStep(() => {}, 0, true, true, undefined, preview);
            const data = { data: { id: 'document-1', accounts: { default: '0.0.55' } } };
            const execute = () => block.runAction({ source: 'form', outputType: 'RunEvent', user, data, actionStatus: step });
            if (preview) await PreviewScope.run(step, execute);
            else await execute();
            if (preview) {
                assert.deepEqual(block.state, {});
                assert.equal(step.getPreviewDocuments()[0].document.id, 'document-1');
            } else {
                assert.equal(block.state[user.id].accountId, '0.0.55');
                assert.deepEqual(step.getPreviewDocuments(), []);
            }
        });
    }
});
