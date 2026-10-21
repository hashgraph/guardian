import assert from 'node:assert/strict';
import { SwitchBlock } from '../../../dist/policy-engine/blocks/switch-block.js';
import { PolicyComponentsUtils } from '../../../dist/policy-engine/policy-components-utils.js';
import { PolicyUtils } from '../../../dist/policy-engine/helpers/utils.js';
import { resolvePreviewFields } from '../../../dist/policy-engine/helpers/preview.js';
import { RecordActionStep } from '../../../dist/policy-engine/record-action-step.js';

const rawRunAction = Object.getPrototypeOf(SwitchBlock.prototype).runAction;

const conditions = [
    { type: 'equal', value: 'amount > 10', tag: 'high', actor: '' },
    { type: 'unconditional', tag: 'low', actor: '' }
];

const formDocument = (amount) => ({
    schema: '#S',
    owner: 'did:user',
    document: PolicyUtils.createVcFromSubject(amount === undefined ? {} : { amount }).toJsonTree()
});

const source = (document) => ({
    schema: '#S',
    document,
    paths: ['amount', 'note'],
    dependencies: {}
});

describe('@unit switchBlock preview field reads', () => {
    const origGetRef = PolicyComponentsUtils.GetBlockRef;
    const origExternal = PolicyComponentsUtils.ExternalEventFn;
    let fired;

    beforeEach(() => {
        fired = [];
        PolicyComponentsUtils.GetBlockRef = () => ({
            uuid: 'sw-uuid',
            policyId: 'p1',
            blockType: 'switchBlock',
            async getOptions() { return { executionFlow: 'firstTrue', conditions }; },
            async triggerEvents(type) { fired.push(type); },
            log() {},
            error() {},
            backup() {},
        });
        PolicyComponentsUtils.ExternalEventFn = () => {};
    });

    afterEach(() => {
        PolicyComponentsUtils.GetBlockRef = origGetRef;
        PolicyComponentsUtils.ExternalEventFn = origExternal;
    });

    const run = async (step, amount) => {
        const block = Object.create(SwitchBlock.prototype);
        await rawRunAction.call(block, { user: { id: 'u', userId: 'uid' }, data: { data: formDocument(amount) }, actionStatus: step });
    };

    const previewStep = (document) => {
        const step = new RecordActionStep(() => {}, 0, true, true, undefined, true);
        step.setPreviewSource(source(document));
        return step;
    };

    it('reports the field a condition reads even when the chosen branch does not read it', async () => {
        const step = previewStep({});
        await run(step, 0);
        assert.ok(fired.includes('low'));
        assert.deepEqual(resolvePreviewFields(step.getPreviewSource(), step.getPreviewReads()), {
            fields: ['amount'],
            missingFields: ['amount']
        });
    });

    it('no longer lists the field as missing once it is filled, and follows the condition', async () => {
        const step = previewStep({ amount: 20 });
        await run(step, 20);
        assert.ok(fired.includes('high'));
        assert.deepEqual(resolvePreviewFields(step.getPreviewSource(), step.getPreviewReads()), {
            fields: ['amount'],
            missingFields: []
        });
    });

    it('records nothing for a document of another schema', async () => {
        const step = new RecordActionStep(() => {}, 0, true, true, undefined, true);
        step.setPreviewSource({ ...source({}), schema: '#Other' });
        await run(step, 0);
        assert.deepEqual(step.getPreviewReads(), []);
    });

    it('records nothing outside a preview', async () => {
        const step = new RecordActionStep(() => {}, 0, true, true);
        await run(step, 0);
        assert.deepEqual(step.getPreviewReads(), []);
    });
});
