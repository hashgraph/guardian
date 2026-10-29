import { PreviewReadTracker } from '../../../dist/policy-engine/helpers/workers/preview-read-tracker.js';
import { createPreviewDocument } from '../helpers/preview-document-fixture.mjs';
import assert from 'node:assert/strict';
import { ButtonBlock } from '../../../dist/policy-engine/blocks/button-block.js';
import { SwitchBlock } from '../../../dist/policy-engine/blocks/switch-block.js';
import { PolicyComponentsUtils } from '../../../dist/policy-engine/policy-components-utils.js';
import { PolicyLink } from '../../../dist/policy-engine/interfaces/policy-event.js';
import { EventActor } from '../../../dist/policy-engine/interfaces/policy-event-type.js';
import { PreviewScope, recordPreviewWait } from '../../../dist/policy-engine/helpers/preview.js';
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
    it('dispatches every target, including former stop-list types, without guessing their behaviour', async () => {
        const calls = [];
        const step = previewStep();
        const block = {
            tag: 'form',
            sourceLinks: [
                link('RunEvent', 'math', 'mathBlock', calls),
                link('RunEvent', 'save', 'sendToGuardianBlock', calls),
                link('RunEvent', 'approve', 'buttonBlock', calls)
            ]
        };
        await triggerEvents.call(block, 'RunEvent', {}, state, step);
        assert.deepEqual(calls, ['math', 'save', 'approve']);
        assert.deepEqual(step.getPreviewDocuments(), []);
    });

    it('records a wait only when the invoked handler reports it', async () => {
        const calls = [];
        const step = previewStep();
        const waiting = link('RunEvent', 'review', 'buttonBlock', calls);
        waiting.run = async () => {
            calls.push('review');
            recordPreviewWait({ source: 'form', outputType: 'RunEvent', data: state, actionStatus: step }, waiting.target);
        };
        await triggerEvents.call({ tag: 'form', sourceLinks: [waiting] }, 'RunEvent', {}, state, step);
        assert.deepEqual(calls, ['review']);
        assert.deepEqual(step.getPreviewDocuments(), [
            { source: 'form', target: 'review', blockType: 'buttonBlock', document: { id: 'doc-1' } }
        ]);
    });

    it('follows an error and a reference link into a calculation, as a normal submit does', async () => {
        const calls = [];
        const step = previewStep();
        const block = {
            tag: 'form',
            sourceLinks: [
                link('ErrorEvent', 'err', 'mathBlock', calls),
                link('ReferenceEvent', 'ref', 'customLogicBlock', calls)
            ]
        };
        await triggerEvents.call(block, 'ErrorEvent', {}, state, step);
        await triggerEvents.call(block, 'ReferenceEvent', {}, state, step);
        assert.deepEqual(calls, ['err', 'ref']);
    });

    it('does not collect refresh/release outputs even when a handler reports a wait', async () => {
        const step = previewStep();
        const calls = [];
        const block = { tag: 'form', sourceLinks: [] };
        for (const output of ['RefreshEvent', 'ReleaseEvent', 'ErrorEvent']) {
            const target = link(output, 'step', 'interfaceStepBlock', calls);
            target.run = async () => {
                calls.push(output);
                recordPreviewWait({ source: 'form', outputType: output, data: state, actionStatus: step }, target.target);
            };
            block.sourceLinks.push(target);
            await triggerEvents.call(block, output, {}, state, step);
        }
        assert.deepEqual(calls, ['RefreshEvent', 'ReleaseEvent', 'ErrorEvent']);
        assert.deepEqual(step.getPreviewDocuments(), [
            { source: 'form', target: 'step', blockType: 'interfaceStepBlock', document: { id: 'doc-1' } }
        ]);
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
        assert.deepEqual(step.getPreviewDocuments(), [
            { source: 'switch', target: null, blockType: null, document: { id: 'doc-1' } }
        ]);
    });

    it('records the document of a branch whose only RunEvent link goes into a refresh input, next to a waiting branch', async () => {
        const calls = [];
        const step = previewStep();
        const waiting = link('RunEvent', 'approve', 'buttonBlock', calls);
        waiting.run = async () => {
            calls.push('approve');
            recordPreviewWait({ source: 'form', outputType: 'RunEvent', data: state, actionStatus: step }, waiting.target);
        };
        await triggerEvents.call({ tag: 'form', sourceLinks: [waiting] }, 'RunEvent', {}, state, step);
        const saved = { data: { id: 'doc-2' } };
        await triggerEvents.call({ tag: 'save', sourceLinks: [link('RunEvent', 'grid', 'interfaceDocumentsSourceBlock', calls, 'RefreshEvent')] }, 'RunEvent', {}, saved, step);
        assert.deepEqual(calls, ['approve']);
        assert.deepEqual(step.getPreviewDocuments(), [
            { source: 'form', target: 'approve', blockType: 'buttonBlock', document: { id: 'doc-1' } },
            { source: 'save', target: null, blockType: null, document: { id: 'doc-2' } }
        ]);
    });

    it('does not record a refresh-only document in an ordinary run', async () => {
        const calls = [];
        const step = new RecordActionStep(() => {}, 0, true, true, undefined, false);
        await triggerEvents.call({ tag: 'save', sourceLinks: [link('RunEvent', 'grid', 'interfaceDocumentsSourceBlock', calls, 'RefreshEvent')] }, 'RunEvent', {}, state, step);
        assert.deepEqual(calls, ['grid']);
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

    it('dispatches synchronous events to former stop-list targets as well as processing blocks', async () => {
        const calls = [];
        const step = previewStep();
        const block = { tag: 'form', sourceLinks: [link('RunEvent', 'step', 'interfaceStepBlock', calls)] };
        assert.equal(await triggerEventSync.call(block, 'RunEvent', {}, state, step), 'step');
        assert.deepEqual(calls, ['step']);
        assert.deepEqual(step.getPreviewDocuments(), []);
    });

    for (const synchronous of [false, true]) {
        it(`enters the real Button handler before collecting its wait, sync=${synchronous}`, async () => {
            const step = previewStep();
            const target = Object.create(ButtonBlock.prototype);
            Object.defineProperties(target, {
                tag: { value: 'approve' }, blockType: { value: 'buttonBlock' },
                uuid: { value: 'approve-uuid' }, policyId: { value: 'p1' },
                policyInstance: { value: { status: 'PUBLISH' } }
            });
            let entered = 0;
            const run = target.runAction.bind(target);
            target.runAction = async event => { entered++; return run(event); };
            const source = { tag: 'form', uuid: 'form-uuid', policyId: 'p1' };
            source.sourceLinks = [new PolicyLink('RunEvent', 'RunEvent', source, target,
                EventActor.EventInitiator, event => target.runAction(event))];
            const dispatch = synchronous ? triggerEventSync : triggerEvents;
            await dispatch.call(source, 'RunEvent', {}, state, step);
            assert.equal(entered, 1);
            assert.deepEqual(step.getPreviewDocuments(), [
                { source: 'form', target: 'approve', blockType: 'buttonBlock', document: { id: 'doc-1' } }
            ]);
        });
    }

    it('retains the actual discontinued-policy gate instead of collecting a wait before entering the block', async () => {
        const step = previewStep();
        const block = Object.create(ButtonBlock.prototype);
        Object.defineProperties(block, {
            tag: { value: 'approve' }, blockType: { value: 'buttonBlock' },
            policyInstance: { value: { status: 'DISCONTINUED' } }
        });
        await block.runAction({ source: 'form', outputType: 'RunEvent', data: state, actionStatus: step });
        assert.deepEqual(step.getPreviewDocuments(), []);
    });

    it('records an actual block with no automatic handler after entering its standard RunEvent method', async () => {
        const step = previewStep();
        const block = Object.create(ButtonBlock.prototype);
        Object.defineProperties(block, {
            tag: { value: 'approve' }, blockType: { value: 'buttonBlock' },
            policyInstance: { value: { status: 'PUBLISH' } }
        });
        await block.runAction({ source: 'form', outputType: 'RunEvent', data: state, actionStatus: step });
        assert.deepEqual(step.getPreviewDocuments(), [
            { source: 'form', target: 'approve', blockType: 'buttonBlock', document: { id: 'doc-1' } }
        ]);
        const ordinary = new RecordActionStep(() => {}, 0, true, true);
        await block.runAction({ source: 'form', outputType: 'RunEvent', data: state, actionStatus: ordinary });
        assert.deepEqual(ordinary.getPreviewDocuments(), []);
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

describe('@unit switch condition fields in preview', () => {
    const origGetRef = PolicyComponentsUtils.GetBlockRef;
    const origExternal = PolicyComponentsUtils.ExternalEventFn;
    const origTrack = PreviewReadTracker.prototype.track;
    let tracked = 0;

    beforeEach(() => {
        tracked = 0;
        PreviewReadTracker.prototype.track = function (...args) { tracked++; return origTrack.apply(this, args); };
    });

    afterEach(() => { PreviewReadTracker.prototype.track = origTrack; });

    after(() => {
        PolicyComponentsUtils.GetBlockRef = origGetRef;
        PolicyComponentsUtils.ExternalEventFn = origExternal;
    });

    for (const formula of ['owner.name == "Ivan"', '(owner).name == "Ivan"', 'owner[("name")] == "Ivan"']) {
    it(`records the full field path for ${formula}`, async () => {
        const taken = [];
        const block = Object.create(SwitchBlock.prototype);
        Object.defineProperty(block, 'policyInstance', { value: { status: 'PUBLISH' } });
        Object.defineProperty(block, 'parent', { value: { changeStep: async () => {} } });
        PolicyComponentsUtils.GetBlockRef = () => ({
            uuid: 'sw-uuid',
            policyId: 'p1',
            blockType: 'switchBlock',
            async getOptions() {
                return { executionFlow: 'allTrue', conditions: [{ type: 'equal', value: formula, tag: 'ivan', actor: '' }] };
            },
            async triggerEvents(tag) { taken.push(tag); },
            log() {},
            error() {},
            backup() {},
        });
        PolicyComponentsUtils.ExternalEventFn = () => {};
        const step = previewStep();
        step.setPreviewSource({ schema: '#S', document: {}, paths: ['owner', 'owner.name', 'buyer', 'buyer.name'], dependencies: {} });
        const document = createPreviewDocument({ policyId: 'p1', tag: 'form' }, null, { owner: { name: 'Ivan' }, buyer: {} }, '#S', 'did:user', null);
        await decoratedRunAction.call(block, { user: { id: 'u', userId: 'uid' }, data: { data: document }, actionStatus: step });
        assert.deepEqual(step.getPreviewReads(), [{ schema: '#S', path: 'owner.name' }]);
        assert.ok(taken.includes('ivan'));
        assert.ok(tracked > 0);
    });
    }
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
