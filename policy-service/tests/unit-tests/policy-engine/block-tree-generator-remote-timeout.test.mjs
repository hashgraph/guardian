import { assert } from 'chai';
import esmock from 'esmock';
import { MessageResponse } from '@guardian/common/models/message-response';
import { PolicyEvents } from '@guardian/interfaces';

const GENERATOR = '../../../dist/policy-engine/block-tree-generator.js';
const COMPONENTS = '../../../dist/policy-engine/policy-components-utils.js';

/*
 * The gateway accepts ?timeout= on setBlockData / setBlockDataByTag and
 * guardian-service forwards it. The policy-service must bound the wait for a
 * remote policy by it, a little short of it, so the reply still arrives.
 */
async function createGenerator() {
    const calls = [];
    const { BlockTreeGenerator } = await esmock(GENERATOR, {
        [COMPONENTS]: {
            PolicyComponentsUtils: {
                isAvailableSetData: async () => null,
                blockSetData: async (...args) => {
                    calls.push(args);
                    return new MessageResponse(true);
                },
                GetBlockByUUID: () => ({ uuid: 'block-1', tag: 'block', blockType: 'requestVcDocumentBlock', policyId: 'policy-1' }),
                GetBlockByTag: () => ({ uuid: 'block-1', tag: 'block', blockType: 'requestVcDocumentBlock', policyId: 'policy-1' }),
            },
            blockCompleteEvent: () => null,
        },
    });
    const generator = new BlockTreeGenerator();
    const handlers = new Map();
    generator.getPolicyMessages = (event, policyId, cb) => handlers.set(event, cb);
    generator.getUser = async () => ({ did: 'did:user' });
    return { BlockTreeGenerator, generator, handlers, calls };
}

describe('@unit BlockTreeGenerator – timeout for a remote policy', function () {
    this.timeout(60000);

    it('computes the deadline a little before the timeout', async () => {
        const { BlockTreeGenerator } = await createGenerator();

        assert.equal(BlockTreeGenerator.remoteWaitDeadline(60000, 1000), 1000 + 60000 - 1000);
        assert.equal(BlockTreeGenerator.remoteWaitDeadline(500, 1000), 1000 + 500 - 50);
        assert.isUndefined(BlockTreeGenerator.remoteWaitDeadline(undefined, 1000));
        assert.isUndefined(BlockTreeGenerator.remoteWaitDeadline(0, 1000));
        assert.isUndefined(BlockTreeGenerator.remoteWaitDeadline(-5, 1000));
    });

    for (const [event, key] of [
        [PolicyEvents.SET_BLOCK_DATA, 'blockId'],
        [PolicyEvents.SET_BLOCK_DATA_BY_TAG, 'tag'],
    ]) {
        it(`passes the timeout of ${event} down to the remote wait`, async () => {
            const { generator, handlers, calls } = await createGenerator();
            await generator.initPolicyEvents('policy-1', {}, {});
            const handler = handlers.get(event);
            assert.isFunction(handler, 'the handler is registered');

            const before = Date.now();
            await handler({ user: {}, [key]: 'block', policyId: 'policy-1', data: {}, waitRemotePolicy: true, timeout: 20000 });
            const waitUntil = calls[0][5];
            assert.isNumber(waitUntil);
            assert.isAtLeast(waitUntil, before + 19000);
            assert.isAtMost(waitUntil, Date.now() + 19000);

            await handler({ user: {}, [key]: 'block', policyId: 'policy-1', data: {}, waitRemotePolicy: true });
            assert.isUndefined(calls[1][5], 'no timeout - wait as before');
        });
    }
});
