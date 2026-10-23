import assert from 'node:assert/strict';
import { SwitchBlock } from '../../../dist/policy-engine/blocks/switch-block.js';
import { PolicyComponentsUtils } from '../../../dist/policy-engine/policy-components-utils.js';
import { PolicyLink } from '../../../dist/policy-engine/interfaces/policy-event.js';
import { EventActor } from '../../../dist/policy-engine/interfaces/policy-event-type.js';
import { PreviewScope, createPreviewDocument } from '../../../dist/policy-engine/helpers/preview.js';
import { RecordActionStep } from '../../../dist/policy-engine/record-action-step.js';

const triggerEvents = SwitchBlock.prototype.triggerEvents;
const triggerEventSync = SwitchBlock.prototype.triggerEventSync;
const decoratedRunAction = SwitchBlock.prototype.runAction;
const updateBlock = SwitchBlock.prototype.updateBlock;
const debugContext = SwitchBlock.prototype.debugContext;
const debugError = SwitchBlock.prototype.debugError;

const link = (outputType, tag, blockType, calls, inputType = 'RunEvent') => ({
    outputType,
    inputType,
    type: inputType,
    source: { uuid: 'form-uuid', tag: 'form' },
    target: { uuid: `${tag}-uuid`, tag, blockType },
    async run() {
        calls.push(tag);
        return tag;
    },
    async runSync() {
        calls.push(tag);
        return tag;
    },
});

const previewStep = () => new RecordActionStep(() => {}, 0, true, true, undefined, true);
const state = { data: { id: 'doc-1' } };

describe('@unit basic block triggerEvents in preview', () => {
    it('runs a calculation block and records the document for a block that would save it', async () => {
        const calls = [];
        const step = previewStep();
        const block = {
            tag: 'form',
            sourceLinks: [
                link('RunEvent', 'math', 'mathBlock', calls),
                link('RunEvent', 'save', 'sendToGuardianBlock', calls)
            ]
        };
        await triggerEvents.call(block, 'RunEvent', {}, state, step);
        assert.deepEqual(calls, ['math']);
        assert.deepEqual(step.getPreviewDocuments(), [
            { source: 'form', target: 'save', blockType: 'sendToGuardianBlock', document: { id: 'doc-1' } }
        ]);
    });

    it('does not fire refresh, release or error events', async () => {
        const calls = [];
        const step = previewStep();
        const block = {
            tag: 'form',
            sourceLinks: [
                link('RefreshEvent', 'step', 'interfaceStepBlock', calls),
                link('ReleaseEvent', 'step', 'interfaceStepBlock', calls),
                link('ErrorEvent', 'err', 'mathBlock', calls)
            ]
        };
        for (const output of ['RefreshEvent', 'ReleaseEvent', 'ErrorEvent']) {
            await triggerEvents.call(block, output, {}, state, step);
        }
        assert.deepEqual(calls, []);
        assert.deepEqual(step.getPreviewDocuments(), []);
    });

    it('does not deliver a RunEvent or a custom output into the refresh input of an allowed block', async () => {
        const calls = [];
        const step = previewStep();
        const block = {
            tag: 'switch',
            sourceLinks: [
                link('RunEvent', 'math', 'mathBlock', calls, 'RefreshEvent'),
                link('Option_1', 'calc', 'calculateContainerBlock', calls, 'RefreshEvent')
            ]
        };
        await triggerEvents.call(block, 'RunEvent', {}, state, step);
        await triggerEvents.call(block, 'Option_1', {}, state, step);
        assert.equal(await triggerEventSync.call(block, 'RunEvent', {}, state, step), null);
        assert.deepEqual(calls, []);
        assert.deepEqual(step.getPreviewDocuments(), []);
    });

    it('records the document at the end of a chain with no next block', async () => {
        const step = previewStep();
        await triggerEvents.call({ tag: 'math', sourceLinks: [] }, 'RunEvent', {}, state, step);
        assert.deepEqual(step.getPreviewDocuments(), [
            { source: 'math', target: null, blockType: null, document: { id: 'doc-1' } }
        ]);
    });

    it('passes the document into a tool and a module through their custom events', async () => {
        const calls = [];
        const step = previewStep();
        const block = {
            tag: 'form',
            sourceLinks: [
                link('RunEvent', 'tool_1', 'tool', calls, 'calc_input'),
                link('RunEvent', 'module_1', 'module', calls, 'module_input')
            ]
        };
        await triggerEvents.call(block, 'RunEvent', {}, state, step);
        assert.deepEqual(calls, ['tool_1', 'module_1']);
        assert.deepEqual(step.getPreviewDocuments(), []);
    });

    it('passes a switch branch to a calculation block', async () => {
        const calls = [];
        const step = previewStep();
        const block = { tag: 'switch', sourceLinks: [link('Option_1', 'math', 'mathBlock', calls)] };
        await triggerEvents.call(block, 'Option_1', {}, state, step);
        assert.deepEqual(calls, ['math']);
    });

    it('runs every linked block outside a preview', async () => {
        const calls = [];
        const step = new RecordActionStep(() => {}, 0, true, true);
        const block = {
            tag: 'form',
            sourceLinks: [
                link('RunEvent', 'math', 'mathBlock', calls),
                link('RunEvent', 'save', 'sendToGuardianBlock', calls),
                link('RunEvent', 'view', 'mathBlock', calls, 'RefreshEvent')
            ]
        };
        await triggerEvents.call(block, 'RunEvent', {}, state, step);
        assert.deepEqual(calls, ['math', 'save', 'view']);
        assert.deepEqual(step.getPreviewDocuments(), []);
    });

    it('stops a synchronous event at a block that would save the document', async () => {
        const calls = [];
        const step = previewStep();
        const block = { tag: 'form', sourceLinks: [link('RunEvent', 'save', 'sendToGuardianBlock', calls)] };
        const result = await triggerEventSync.call(block, 'RunEvent', {}, state, step);
        assert.equal(result, null);
        assert.deepEqual(calls, []);
        assert.equal(step.getPreviewDocuments().length, 1);
    });
});

describe('@unit basic block runAction in preview', () => {
    const origGetRef = PolicyComponentsUtils.GetBlockRef;
    const origExternal = PolicyComponentsUtils.ExternalEventFn;

    after(() => {
        PolicyComponentsUtils.GetBlockRef = origGetRef;
        PolicyComponentsUtils.ExternalEventFn = origExternal;
    });

    const run = async (actionStatus) => {
        const steps = [];
        const block = Object.create(SwitchBlock.prototype);
        Object.defineProperty(block, 'policyInstance', { value: { status: 'PUBLISH' } });
        Object.defineProperty(block, 'parent', { value: { changeStep: async () => { steps.push('changed'); } } });
        PolicyComponentsUtils.GetBlockRef = () => ({
            uuid: 'sw-uuid',
            policyId: 'p1',
            blockType: 'switchBlock',
            async getOptions() { return { executionFlow: 'allTrue', conditions: [] }; },
            async triggerEvents() {},
            log() {},
            error() {},
            backup() {},
        });
        PolicyComponentsUtils.ExternalEventFn = () => {};
        await decoratedRunAction.call(block, { user: { id: 'u', userId: 'uid' }, data: { data: { owner: 'o' } }, actionStatus });
        return steps;
    };

    it('does not move the user to another step during a preview', async () => {
        assert.deepEqual(await run(previewStep()), []);
    });

    it('still moves the step outside a preview', async () => {
        assert.deepEqual(await run(new RecordActionStep(() => {})), ['changed']);
    });
});

describe('@unit basic block screen updates and debug records in preview', () => {
    const fakeBlock = () => {
        const calls = { saved: 0, debugContexts: 0, debugErrors: 0 };
        const block = {
            _dryRun: 'dry-run-policy',
            tag: 'math',
            options: { followUser: true },
            components: {
                debugContext: async (tag, context) => {
                    calls.debugContexts++;
                    return context;
                },
                debugError: () => {
                    calls.debugErrors++;
                },
            },
            saveState: async () => {
                calls.saved++;
            },
        };
        return { block, calls };
    };

    it('does not save state or notify users during a preview', async () => {
        const { block, calls } = fakeBlock();
        await PreviewScope.run(previewStep(), () => updateBlock.call(block, {}, { did: 'did:user' }, 'math', 'uid'));
        assert.equal(calls.saved, 0);
    });

    it('does not write a Dry Run debug record during a preview', async () => {
        const { block, calls } = fakeBlock();
        const context = { documents: { a: 1 } };
        const result = await PreviewScope.run(previewStep(), () => debugContext.call(block, context));
        await PreviewScope.run(previewStep(), async () => debugError.call(block, new Error('boom')));
        assert.equal(result, context);
        assert.equal(calls.debugContexts, 0);
        assert.equal(calls.debugErrors, 0);
    });

    it('still writes the Dry Run debug record outside a preview', async () => {
        const { block, calls } = fakeBlock();
        await debugContext.call(block, { documents: {} });
        debugError.call(block, new Error('boom'));
        assert.equal(calls.debugContexts, 1);
        assert.equal(calls.debugErrors, 1);
    });
});

describe('@unit Issuer actor with a preview document', () => {
    const origLookup = PolicyComponentsUtils.GetPolicyUserByDID;
    let lookups;

    beforeEach(() => {
        lookups = [];
        PolicyComponentsUtils.GetPolicyUserByDID = async (did) => {
            lookups.push(did);
            return { did };
        };
    });

    after(() => {
        PolicyComponentsUtils.GetPolicyUserByDID = origLookup;
    });

    it('routes the event to the same user that normal signing would use as issuer', async () => {
        const user = { did: 'did:user', userId: 'uid', equal: (did) => did === 'did:user' };
        const received = [];
        const source = { policyId: 'p1', tag: 'form', uuid: 'form-uuid' };
        const target = { policyId: 'p1', tag: 'calc', uuid: 'calc-uuid' };
        const issuerLink = new PolicyLink('RunEvent', 'RunEvent', source, target, EventActor.Issuer, (event) => {
            received.push(event.user);
        });
        const document = createPreviewDocument({ policyId: 'p1', tag: 'form' }, user, { amount: 1 }, '#S', 'did:user', null);
        await issuerLink.run(user, { data: document }, null);
        assert.deepEqual(lookups, []);
        assert.equal(received[0], user);
    });
});
