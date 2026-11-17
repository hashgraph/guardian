import { assert } from 'chai';
import { SplitBlock } from '../../../dist/policy-engine/blocks/split-block.js';
import { RecordActionStep } from '../../../dist/policy-engine/record-action-step.js';
import { UserCredentials } from '../../../dist/policy-engine/policy-user.js';
import { PolicyComponentsUtils } from '../../../dist/policy-engine/policy-components-utils.js';

const node = (uuid, tag) => ({ uuid, tag });
const link = (source, target) => ({ source, target, type: 'RunEvent' });

// A split of one document into several chunks triggers the output event of the block once per chunk.
// The chunks are independent documents, so each of them runs the same downstream links: that is a
// fan-out, not a cycle, and the action step must not reject the second chunk.
describe('SplitBlock.addDocs fan-out', () => {
    const originalCreate = UserCredentials.create;
    const originalExternalEvent = PolicyComponentsUtils.ExternalEventFn;
    let block;
    let triggered;
    let ref;

    beforeEach(() => {
        UserCredentials.create = async () => ({});
        PolicyComponentsUtils.ExternalEventFn = () => undefined;
        triggered = [];
        const downstream = [link(node('split', 'split'), node('save', 'save_chanks')), link(node('save', 'save_chanks'), node('mint', 'mint'))];
        ref = {
            policyId: 'policy',
            uuid: 'split',
            policyOwner: 'did:owner',
            databaseServer: {
                getResidue: async () => [],
                removeResidue: async () => undefined,
                setResidue: async () => undefined,
            },
            // what the real triggerEvents does with the action step of a run event
            triggerEvents: async (output, user, state, actionStatus) => {
                if (output === 'RunEvent') {
                    for (const item of downstream) {
                        actionStatus.checkCycle(item);
                    }
                    triggered.push(state.data.length);
                }
            },
        };
        block = Object.create(SplitBlock.prototype);
        // two chunks of one document, as split() builds them for 2000 with a threshold of 1000
        block.split = async (_ref, _root, _user, data) => {
            data.push([{ document: { id: 1, hash: 'a' } }]);
            data.push([{ document: { id: 2, hash: 'b' } }]);
            return [];
        };
    });

    afterEach(() => {
        UserCredentials.create = originalCreate;
        PolicyComponentsUtils.ExternalEventFn = originalExternalEvent;
    });

    it('runs the downstream links of every chunk within one action step', async () => {
        const step = new RecordActionStep(() => undefined);

        await block.addDocs(ref, { id: 'user' }, [{ id: 'doc' }], null, step);

        assert.deepEqual(triggered, [1, 1]);
    });
});
