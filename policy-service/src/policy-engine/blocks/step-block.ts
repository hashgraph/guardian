import { ActionCallback, ContainerBlock, StateField } from '../helpers/decorators/index.js';
import { BlockActionError } from '../errors/index.js';
import { PolicyComponentsUtils } from '../policy-components-utils.js';
import { AnyBlockType, IPolicyBlock, IPolicyContainerBlock, IPolicyEventState, IPolicyGetData } from '../policy-engine.interface.js';
import { IPolicyEvent, PolicyInputEventType, PolicyOutputEventType } from '../interfaces/index.js';
import { ChildrenType, ControlType, PropertyType, SelectItemType } from '../interfaces/block-about.js';
import { PolicyUser } from '../policy-user.js';
import { ExternalEvent, ExternalEventType } from '../interfaces/external-event.js';
import { LocationType } from '@guardian/interfaces';
import { RecordActionStep } from '../record-action-step.js';

/**
 * Step block
 */
@ContainerBlock({
    blockType: 'interfaceStepBlock',
    commonBlock: false,
    actionType: LocationType.REMOTE,
    canMock: false,
    about: {
        label: 'Step',
        title: `Add 'Step' Block`,
        post: false,
        get: true,
        children: ChildrenType.Any,
        control: ControlType.UI,
        input: [
            PolicyInputEventType.RunEvent,
            PolicyInputEventType.RefreshEvent,
        ],
        output: [
            PolicyOutputEventType.RefreshEvent
        ],
        defaultEvent: false,
        properties: [{
            name: 'cyclic',
            label: 'Cyclic',
            title: 'Restart the block when the final step is reached?',
            type: PropertyType.Checkbox,
            editable: true
        }, {
            name: 'finalBlocks',
            label: 'Final steps',
            title: 'Final steps',
            type: PropertyType.MultipleSelect,
            items: SelectItemType.Children,
            editable: true
        }, {
            name: 'uiMetaData',
            label: 'UI',
            title: 'UI Properties',
            type: PropertyType.Group,
            editable: true,
            properties: [{
                name: 'title',
                label: 'Title',
                title: 'Title',
                type: PropertyType.Input,
                editable: true
            }]
        }]
    },
    variables: []
})
export class InterfaceStepBlock {
    /**
     * Block state
     */
    @StateField()
    declare state: { [key: string]: any };
    /**
     * Final steps
     */
    private readonly endIndexes: { [x: number]: boolean } = {};

    /**
     * Before init callback
     */
    public async beforeInit(): Promise<void> {
        this.state = {}

        const ref = PolicyComponentsUtils.GetBlockRef(this);

        this.endIndexes[ref.children.length - 1] = true;
        if (ref.options?.finalBlocks && Array.isArray(ref.options.finalBlocks)) {
            for (const finalBlock of ref.options.finalBlocks) {
                const index = ref.children.findIndex(c => c.tag === finalBlock);
                this.endIndexes[index] = true;
            }
        }
    }

    /**
     * Change step
     * @param user
     * @param data
     * @param target
     */
    @ActionCallback({
        output: PolicyOutputEventType.RefreshEvent
    })
    async changeStep(user: PolicyUser, data: any, target: IPolicyBlock, actionStatus: RecordActionStep) {
        const ref = PolicyComponentsUtils.GetBlockRef(this);

        let blockState: any;
        if (!this.state.hasOwnProperty(user.id)) {
            blockState = {};
            this.state[user.id] = blockState;
        } else {
            blockState = this.state[user.id];
        }

        if (target) {
            const index = ref.children.findIndex(c => c.uuid === target.uuid);
            blockState.index = index;
            if (blockState.index === -1) {
                throw new BlockActionError('Bad child block', ref.blockType, ref.uuid);
            }
        } else {
            throw new BlockActionError('Bad child block', ref.blockType, ref.uuid);
        }
        ref.log(`changeStep: ${blockState?.index}, ${user?.id}`);
        ref.updateBlock(blockState, user, ref.tag, user.userId);
        await ref.triggerEvents(PolicyOutputEventType.RefreshEvent, user, null, actionStatus);

        PolicyComponentsUtils.ExternalEventFn(new ExternalEvent(ExternalEventType.Step, ref, user, {
            index: blockState?.index
        }));

        ref.backup();
    }

    /**
     * Release child
     * @event PolicyEventType.ReleaseEvent
     * @param {IPolicyEvent} event
     */
    @ActionCallback({
        type: PolicyInputEventType.ReleaseEvent
    })
    async releaseChild(event: IPolicyEvent<IPolicyEventState>) {
        const ref = PolicyComponentsUtils.GetBlockRef(this);
        const options = await ref.getOptions(event.user);
        const index = ref.children.findIndex(c => c.uuid === event.sourceId);
        if ((options.cyclic && index !== -1) && (this.endIndexes[index])) {
            const user = event.user;
            if (user) {
                let blockState: any;
                if (!this.state.hasOwnProperty(user.id)) {
                    blockState = {};
                    this.state[user.id] = blockState;
                } else {
                    blockState = this.state[user.id];
                }
                blockState.index = 0;
                ref.updateBlock(blockState, user, ref.tag, user.userId);
                await ref.triggerEvents(PolicyOutputEventType.RefreshEvent, user, null, event.actionStatus);
            }
        }

        ref.backup();
    }

    /**
     * Get block data
     * @param user
     */
    async getData(user: PolicyUser): Promise<IPolicyGetData> {
        const ref = PolicyComponentsUtils.GetBlockRef(this);
        const options = await ref.getOptions(user);
        let blockState: any;
        if (!this.state.hasOwnProperty(user.id)) {
            blockState = {};
            this.state[user.id] = blockState;
        } else {
            blockState = this.state[user.id];
        }
        if (blockState.index === undefined) {
            blockState.index = 0;
        }
        const activeChild = (ref as IPolicyContainerBlock).children[blockState.index];
        return {
            id: ref.uuid,
            blockType: ref.blockType,
            actionType: ref.actionType,
            readonly: (
                ref.actionType === LocationType.REMOTE &&
                user.location === LocationType.REMOTE
            ),
            uiMetaData: options?.uiMetaData,
            index: blockState.index,
            // The active child is a server-side block (`defaultActive: false`) - the
            // workflow is *executing*, it is not waiting on another participant. The
            // container serializes such a child as `undefined`, which on its own is
            // indistinguishable from a role gate, so the viewer used to show "This step
            // isn't available to you right now" for every chain that ran longer than a
            // repaint. Reported explicitly so it can show progress instead; the flag
            // costs nothing when the active child has UI.
            pending: !!activeChild && !activeChild.defaultActive
        };
    }

    /**
     * Is child active
     * @param child
     * @param user
     */
    public isChildActive(child: AnyBlockType, user: PolicyUser): boolean {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyContainerBlock>(this);
        const childIndex = ref.children.indexOf(child);
        if (childIndex === -1) {
            throw new BlockActionError('Bad block child', ref.blockType, ref.uuid);
        }

        let index = 0;
        const state = this.state[user.id];
        if (state) {
            index = state.index;
        }
        return index === childIndex;
    }

    /**
     * Move the step off a non-UI child the workflow dead-ended on.
     *
     * `runAction` moves the step onto a child *before* running it, so a `defaultActive:
     * false` child (customLogicBlock, sendToGuardianBlock, ...) is the active child while
     * it executes. Those have no UI, so the container serializes them as `undefined`, and
     * the viewer renders "This step isn't available to you right now". Normally the chain
     * moves on immediately; when it dead-ends there instead - a customLogic script that
     * returns an empty result never fires a RunEvent - the step stays pointed at a child
     * nothing can render, permanently.
     *
     * Callers signal the dead end explicitly rather than having the step infer it, because
     * outgoing links are fired without awaiting unless the run is recorded, so event order
     * is not a reliable stall signal. This also keeps the method inert during the normal
     * transient pass through a non-UI child.
     *
     * A cyclic step rewinds to the first child - the same resting place `releaseChild`
     * picks after a successful cycle. Anything else walks back to the closest earlier
     * child with UI. (Rewinding cyclic steps by walking back would land the user on a
     * completed sub-wizard: VM0033's `new_project` has two `tool` children between the
     * form and the calculation.)
     *
     * No-op unless the step is currently parked on `child`, and never for a
     * `defaultActive: true` child - a permission-gated UI child genuinely is another
     * participant's turn.
     *
     * @param user
     * @param child
     * @param actionStatus
     */
    public async unparkStalledChild(
        user: PolicyUser,
        child: AnyBlockType,
        actionStatus?: RecordActionStep
    ): Promise<boolean> {
        if (!user || !child || child.defaultActive) {
            return false;
        }
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyContainerBlock>(this);
        const childIndex = ref.children.findIndex((c) => c.uuid === child.uuid);
        const blockState = this.state[user.id];
        if (childIndex === -1 || !blockState || blockState.index !== childIndex) {
            return false;
        }

        const fallbackIndex = this.isCyclic() ? 0 : this.findRenderableIndexBefore(childIndex, user);
        if (fallbackIndex === childIndex) {
            return false;
        }

        ref.warn(
            `step stalled on non-UI child "${child.tag}" (index ${childIndex}); ` +
            `rewinding to index ${fallbackIndex} for user ${user.id}`
        );
        blockState.index = fallbackIndex;
        ref.updateBlock(blockState, user, ref.tag, user.userId);
        await ref.triggerEvents(PolicyOutputEventType.RefreshEvent, user, null, actionStatus);
        ref.backup();
        return true;
    }

    /**
     * Closest child before `index` that this user can actually see
     * @param index
     * @param user
     */
    private findRenderableIndexBefore(index: number, user: PolicyUser): number {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyContainerBlock>(this);
        for (let i = index - 1; i > 0; i--) {
            const candidate = ref.children[i];
            if (candidate?.defaultActive && candidate.hasPermission(user)) {
                return i;
            }
        }
        return 0;
    }

    /**
     * Is cyclic
     */
    public isCyclic(): boolean {
        const ref = PolicyComponentsUtils.GetBlockRef(this);
        return !!ref.options.cyclic;
    }

    /**
     * On Empty Block State
     */
    public onEmptyBlockState(): void {
        this.state = {};
    }
}
