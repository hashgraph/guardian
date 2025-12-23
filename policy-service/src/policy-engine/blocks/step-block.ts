import { ActionCallback, ContainerBlock, StateField } from '../helpers/decorators/index.js';
import { BlockActionError } from '../errors/index.js';
import { PolicyComponentsUtils } from '../policy-components-utils.js';
import { AnyBlockType, IPolicyBlock, IPolicyContainerBlock, IPolicyEventState, IPolicyGetData } from '../policy-engine.interface.js';
import { IPolicyEvent, PolicyInputEventType, PolicyOutputEventType } from '../interfaces/index.js';
import { ChildrenType, ControlType, PropertyType, SelectItemType } from '../interfaces/block-about.js';
import { PolicyUser } from '../policy-user.js';
import { ExternalEvent, ExternalEventType } from '../interfaces/external-event.js';
import { LocationType } from '@guardian/interfaces';

/**
 * Step block
 */
@ContainerBlock({
    blockType: 'interfaceStepBlock',
    commonBlock: false,
    actionType: LocationType.REMOTE,
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
            type: PropertyType.Checkbox
        }, {
            name: 'finalBlocks',
            label: 'Final steps',
            title: 'Final steps',
            type: PropertyType.MultipleSelect,
            items: SelectItemType.Children
        }, {
            name: 'uiMetaData',
            label: 'UI',
            title: 'UI Properties',
            type: PropertyType.Group,
            properties: [{
                name: 'title',
                label: 'Title',
                title: 'Title',
                type: PropertyType.Input
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
    async changeStep(user: PolicyUser, data: any, target: IPolicyBlock) {
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
        await ref.triggerEvents(PolicyOutputEventType.RefreshEvent, user, null, null);

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
        const index = ref.children.findIndex(c => c.uuid === event.sourceId);
        if ((ref.options.cyclic && index !== -1) && (this.endIndexes[index])) {
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
                await ref.triggerEvents(PolicyOutputEventType.RefreshEvent, user, null, null);
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
        return {
            id: ref.uuid,
            blockType: ref.blockType,
            actionType: ref.actionType,
            readonly: (
                ref.actionType === LocationType.REMOTE &&
                user.location === LocationType.REMOTE
            ),
            uiMetaData: ref.options?.uiMetaData,
            index: blockState.index
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
