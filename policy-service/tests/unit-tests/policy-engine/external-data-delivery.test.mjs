import assert from 'node:assert/strict';
import esmock from 'esmock';
import { BlockErrorActions, PolicyEvents } from '@guardian/interfaces';

describe('external data policy replies', function () {
    this.timeout(60000);
    const policyId = 'policy';
    let blocks;
    let deliveries;
    let handlers;

    function receiver(tag, action = BlockErrorActions.NO_ACTION, failure, owner = policyId) {
        return {
            tag, policyId: owner, blockType: 'externalDataBlock', options: { onErrorAction: action },
            async receiveData(document, step, strict = false) {
                deliveries.push({ tag, document, step });
                if (strict && failure) step.addError(new Error(failure), 'externalDataBlock');
            },
        };
    }

    before(async () => {
        const { BlockTreeGenerator } = await esmock('../../../dist/policy-engine/block-tree-generator.js', {
            '../../../dist/policy-engine/policy-components-utils.js': {
                PolicyComponentsUtils: {
                    ExternalDataBlocks: { values: () => blocks.values() },
                    GetBlockByTag: (_policy, tag) => blocks.find((block) => block.tag === tag),
                    isAvailableReceiveData: (block, id) => Boolean(block && block.policyId === id && typeof block.receiveData === 'function'),
                    blockReceiveData: (block, document, step) => block.receiveData(document, step),
                },
            },
            '../../../dist/policy-engine/record-utils.js': { RecordUtils: { RecordExternalData: () => {} } },
        });
        const generator = new BlockTreeGenerator();
        handlers = new Map();
        generator.getPolicyMessages = (event, _id, handler) => handlers.set(event, handler);
        await generator.initPolicyEvents(policyId, {}, {});
    });

    beforeEach(() => { blocks = []; deliveries = []; });
    afterEach(() => { for (const { step } of deliveries) step.cancel(); });

    for (const event of [PolicyEvents.MRV_DATA, PolicyEvents.MRV_DATA_CUSTOM]) {
        const run = (flags = {}) => handlers.get(event)({
            policyId, data: { blockTag: 'external', data: { document: { marker: 'bad' } }, ...flags },
        });

        describe(event, () => {
            it('returns 404 when no block can receive strict data', async () => {
                const result = await run({ strict: true });
                assert.equal(result.code, 404);
                assert.equal(result.error, 'Block not found');
            });

            it('does not deliver to a block belonging to another policy', async () => {
                blocks = [receiver('external', BlockErrorActions.NO_ACTION, undefined, 'other-policy')];
                const result = await run({ strict: true });
                assert.equal(result.code, 404);
                assert.deepEqual(deliveries, []);
            });

            it('returns 404 for a tag that cannot receive documents', async () => {
                blocks = [{ tag: 'external', policyId, blockType: 'interfaceContainerBlock' }];
                assert.equal((await run({ strict: true })).code, 404);
            });

            for (const flags of [{}, { strict: false }, { syncEvents: true }, { strict: true, syncEvents: true }]) {
                it(`keeps missing-block replies for legacy flags ${JSON.stringify(flags)}`, async () => {
                    const result = await run(flags);
                    assert.equal(result.code, 200);
                    assert.equal(result.error, null);
                    assert.deepEqual(result.body, flags.syncEvents ? { response: {}, result: undefined, steps: [] } : {});
                });
            }

            for (const action of [BlockErrorActions.NO_ACTION, BlockErrorActions.GOTO_STEP, BlockErrorActions.GOTO_TAG]) {
                it(`returns the entry error text as 422 for ${action}`, async () => {
                    blocks = [receiver('external', action, 'marker must be ok')];
                    const result = await run({ strict: true });
                    assert.equal(result.code, 422);
                    assert.equal(result.error, 'marker must be ok');
                });
            }

            it('reports that the entry block is retrying instead of reporting success or failure', async () => {
                blocks = [receiver('external', BlockErrorActions.RETRY, 'marker must be ok')];
                const result = await run({ strict: true });
                assert.equal(result.code, 200);
                assert.deepEqual(result.body, { retrying: true });
            });

            it('does not treat a clean first attempt on a retry-enabled block as pending', async () => {
                blocks = [receiver('external', BlockErrorActions.RETRY)];
                const result = await run({ strict: true });
                assert.equal(result.error, null);
                assert.deepEqual(result.body, {});
                assert.equal(deliveries.length, 1);
            });

            it('keeps entry processing asynchronous for later policy blocks', async () => {
                blocks = [receiver('external')];
                await run({ strict: true });
                assert.equal(deliveries[0].step.syncActions, false);
            });

            for (const flags of [{}, { strict: false }, { strict: true, syncEvents: true }]) {
                it(`does not collect strict entry errors for legacy flags ${JSON.stringify(flags)}`, async () => {
                    blocks = [receiver('external', BlockErrorActions.NO_ACTION, 'marker must be ok')];
                    const result = await run(flags);
                    assert.equal(result.code, 200);
                    assert.deepEqual(deliveries[0].step.getErrors(), []);
                });
            }
        });
    }

    for (const order of ['retry-first', 'failure-first']) {
        it(`delivers to all matching blocks and prioritizes a final error with ${order}`, async () => {
            const retry = receiver('retry', BlockErrorActions.RETRY, 'retry error');
            const failure = receiver('failed', BlockErrorActions.NO_ACTION, 'final error');
            const clean = receiver('clean');
            blocks = order === 'retry-first' ? [retry, failure, clean] : [failure, retry, clean];
            const result = await handlers.get(PolicyEvents.MRV_DATA)({ data: { strict: true, data: {} } });
            assert.equal(result.code, 422);
            assert.equal(result.error, 'final error');
            assert.deepEqual(deliveries.map(({ tag }) => tag), blocks.map(({ tag }) => tag));
        });
    }

    it('does not attribute a previous retry error to a later clean block', async () => {
        blocks = [receiver('retry', BlockErrorActions.RETRY, 'retry error'), receiver('clean')];
        const result = await handlers.get(PolicyEvents.MRV_DATA)({ data: { strict: true, data: {} } });
        assert.deepEqual(result.body, { retrying: true });
        assert.equal(deliveries.length, 2);
    });

    it('keeps the first final error when several entry blocks fail', async () => {
        blocks = [receiver('first', BlockErrorActions.NO_ACTION, 'first error'), receiver('second', BlockErrorActions.NO_ACTION, 'second error')];
        const result = await handlers.get(PolicyEvents.MRV_DATA)({ data: { strict: true, data: {} } });
        assert.equal(result.code, 422);
        assert.equal(result.error, 'first error');
        assert.equal(deliveries.length, 2);
    });
});
