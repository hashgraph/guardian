import assert from 'node:assert/strict';
import { makeBlock, makeUser, restoreHarness } from './_block-exec-harness.mjs';
import { InterfaceStepBlock } from '../../../dist/policy-engine/blocks/step-block.js';
import { PolicyComponentsUtils } from '../../../dist/policy-engine/policy-components-utils.js';
import { PolicyOutputEventType } from '../../../dist/policy-engine/interfaces/index.js';

/**
 * Coverage for the "This step isn't available to you right now" dead end.
 *
 * `runAction` moves the step onto a child before running it, so mid-chain `defaultActive:
 * false` children (customLogicBlock, sendToGuardianBlock) become the active child while
 * they execute. The container serializes a non-active child as `undefined`, so when the
 * chain dead-ends on one — most commonly a customLogic script returning an empty result,
 * which never fires a RunEvent — the step stays pointed at a child the viewer cannot
 * render, permanently.
 *
 * `unparkStalledChild` is the escape hatch. It is deliberately inert unless a caller
 * signals a real dead end, so the normal transient pass through a non-UI child, and every
 * step in every published policy, behaves exactly as before.
 */
describe('@unit interfaceStepBlock stall recovery', () => {
    // Sibling suites in this directory swap GetBlockRef for a fixed stub.
    let origGetBlockRef;
    before(() => {
        origGetBlockRef = PolicyComponentsUtils.GetBlockRef;
        PolicyComponentsUtils.GetBlockRef = (obj) => obj;
    });
    after(() => {
        PolicyComponentsUtils.GetBlockRef = origGetBlockRef;
        restoreHarness();
    });

    const child = (tag, defaultActive, permitted = true) => ({
        tag,
        uuid: tag,
        defaultActive,
        options: {},
        blockType: defaultActive ? 'requestVcDocumentBlock' : 'customLogicBlock',
        hasPermission: () => permitted,
    });

    /** [form (UI), save (non-UI), calc (non-UI)] — the shape of a VM0051 report step. */
    function setup({ cyclic = true, children, index = 2 } = {}) {
        const { block } = makeBlock(InterfaceStepBlock, { options: { cyclic } });
        const kids = children || [
            child('form', true),
            child('save', false),
            child('calc', false),
        ];
        for (const c of kids) {
            // the engine wires isActive() through the parent, same as basic-block does
            c.isActive = (u) => block.isChildActive(c, u);
            block.registerChild(c);
        }
        const user = makeUser({ id: 'u1', userId: 'u1' });
        block.state = { [user.id]: { index } };

        const events = [];
        block.triggerEvents = async (...args) => { events.push(args); };
        const updates = [];
        block.updateBlock = (state) => { updates.push({ ...state }); };
        block.backup = () => {};

        return { block, kids, user, events, updates };
    }

    it('rewinds a cyclic step parked on a non-UI child back to the first child', async () => {
        const { block, kids, user, events, updates } = setup({ cyclic: true, index: 2 });

        const moved = await block.unparkStalledChild(user, kids[2]);

        assert.equal(moved, true, 'the stall is reported as handled');
        assert.equal(block.state[user.id].index, 0, 'index rewinds to the renderable first child');
        assert.deepEqual(updates.at(-1), { index: 0 }, 'the new index is pushed to the client');
        assert.ok(
            events.some(([type]) => type === PolicyOutputEventType.RefreshEvent),
            'a RefreshEvent tells the viewer to reload the step'
        );
    });

    it('sends a cyclic step to the form, not back to a completed sub-wizard', async () => {
        // VM0033's new_project, verified against the live policy config: walking back from
        // the calculation would land the user on AR_tool_05_project.
        const kids = [
            child('add_project_bnt', true),
            child('save_project_hedera', false),
            child('save_project', false),
            child('AR_tool_14_project', true),
            child('AR_tool_05_project', true),
            child('calculate_project_fields', false),
            child('save_project_auto_hedera', false),
            child('save_project_auto', false),
        ];
        for (const parked of [1, 2, 5, 6, 7]) {
            const { block, kids: k, user } = setup({ cyclic: true, children: kids.map((c) => ({ ...c })), index: parked });
            await block.unparkStalledChild(user, k[parked]);
            assert.equal(block.state[user.id].index, 0, `parked at ${parked} rewinds to the form`);
        }
    });

    it('rewinds a non-cyclic step to the nearest preceding renderable child', async () => {
        const kids = [child('form', true), child('info', true), child('save', false), child('calc', false)];
        const { block, kids: k, user } = setup({ cyclic: false, children: kids, index: 3 });

        await block.unparkStalledChild(user, k[3]);

        assert.equal(block.state[user.id].index, 1, 'stops at the closest child with UI');
    });

    it('leaves a permission-gated UI child alone — that really is another role\'s turn', async () => {
        const kids = [child('form', true), child('approve', true, false)];
        const { block, kids: k, user, events } = setup({ children: kids, index: 1 });

        const moved = await block.unparkStalledChild(user, k[1]);

        assert.equal(moved, false, 'not treated as a stall');
        assert.equal(block.state[user.id].index, 1, 'the workflow stays where it is');
        assert.equal(events.length, 0, 'no RefreshEvent');
    });

    it('is a no-op when the step has already moved past the child', async () => {
        const { block, kids, user, events } = setup({ index: 0 });

        const moved = await block.unparkStalledChild(user, kids[2]);

        assert.equal(moved, false, 'a child that is no longer active cannot be stalling the step');
        assert.equal(block.state[user.id].index, 0);
        assert.equal(events.length, 0);
    });

    it('is a no-op for an unknown child, a missing child, a missing user or missing state', async () => {
        const { block, kids, user } = setup({ index: 2 });

        assert.equal(await block.unparkStalledChild(user, child('stranger', false)), false);
        assert.equal(await block.unparkStalledChild(user, null), false);
        assert.equal(await block.unparkStalledChild(null, kids[2]), false);
        assert.equal(await block.unparkStalledChild(makeUser({ id: 'nobody' }), kids[2]), false);
        assert.equal(block.state[user.id].index, 2, 'state untouched');
    });

    it('does not rewind when the stalled child is already the first one', async () => {
        const kids = [child('save', false), child('calc', false)];
        const { block, kids: k, user } = setup({ cyclic: false, children: kids, index: 0 });

        assert.equal(await block.unparkStalledChild(user, k[0]), false);
    });

    it('does not touch getData or isChildActive semantics', async () => {
        const { block, kids, user } = setup({ index: 2 });

        const data = await block.getData(user);

        assert.equal(data.index, 2, 'getData still reports the real workflow position');
        assert.equal(block.isChildActive(kids[2], user), true, 'the parked child is still the active one');
        assert.equal(block.isChildActive(kids[0], user), false, 'and earlier children are still inactive');
        assert.equal(data.blocks[0], undefined, 'the form is not silently re-enabled for setData');
    });
});
