import { ActionCallback, ContainerBlock, StateField } from '@policy-engine/helpers/decorators';
import { BlockActionError } from '@policy-engine/errors';
import { PolicyComponentsUtils } from '@policy-engine/policy-components-utils';
import { AnyBlockType, IPolicyBlock, IPolicyContainerBlock, IPolicyDocument, IPolicyEventState, IPolicyState } from '@policy-engine/policy-engine.interface';
import { IPolicyEvent, PolicyInputEventType, PolicyOutputEventType } from '@policy-engine/interfaces';
import { ChildrenType, ControlType } from '@policy-engine/interfaces/block-about';
import { IPolicyUser } from '@policy-engine/policy-user';

/**
 * Step block
 */
@ContainerBlock({
    blockType: 'interfaceStepBlock',
    commonBlock: false,
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
        defaultEvent: false
    }
})
export class InterfaceStepBlock {
    /**
     * Block state
     */
    @StateField()
    state: { [key: string]: any } = { index: 0 };

    /**
     * Change step
     * @param user
     * @param data
     * @param target
     */
    @ActionCallback({
        output: PolicyOutputEventType.RefreshEvent
    })
    async changeStep(user: IPolicyUser, data: any, target: IPolicyBlock) {
        const ref = PolicyComponentsUtils.GetBlockRef(this);
        let blockState: any;
        if (!this.state.hasOwnProperty(user.did)) {
            blockState = {};
            this.state[user.did] = blockState;
        } else {
            blockState = this.state[user.did];
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
        ref.log(`changeStep: ${blockState?.index}, ${user?.did}`);
        ref.updateBlock(blockState, user);
        ref.triggerEvents(PolicyOutputEventType.RefreshEvent, user, null);
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
        if (
            index !== -1 &&
            index === (ref.children.length - 1) &&
            ref.options.cyclic
        ) {
            const user = event.user;
            if(user) {
                let blockState: any;
                if (!this.state.hasOwnProperty(user.did)) {
                    blockState = {};
                    this.state[user.did] = blockState;
                } else {
                    blockState = this.state[user.did];
                }
                blockState.index = 0;
                ref.updateBlock(blockState, user);
                ref.triggerEvents(PolicyOutputEventType.RefreshEvent, user, null);
            }
        }
    }

    /**
     * Get block data
     * @param user
     */
    async getData(user: IPolicyUser): Promise<any> {
        const ref = PolicyComponentsUtils.GetBlockRef(this);
        let blockState: any;
        if (!this.state.hasOwnProperty(user.did)) {
            blockState = {};
            this.state[user.did] = blockState;
        } else {
            blockState = this.state[user.did];
        }
        if (blockState.index === undefined) {
            blockState.index = 0;
        }
        const { options } = ref;
        return { uiMetaData: options.uiMetaData, index: blockState.index };
    }

    /**
     * Is child active
     * @param child
     * @param user
     */
    public isChildActive(child: AnyBlockType, user: IPolicyUser): boolean {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyContainerBlock>(this);
        const childIndex = ref.children.indexOf(child);
        if (childIndex === -1) {
            throw new BlockActionError('Bad block child', ref.blockType, ref.uuid);
        }

        let index = 0;
        const state = this.state[user.did];
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
}
