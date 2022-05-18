import { ActionCallback, ContainerBlock, StateField } from '@policy-engine/helpers/decorators';
import { BlockActionError } from '@policy-engine/errors';
import { PolicyComponentsUtils } from '../policy-components-utils';
import { AnyBlockType, IPolicyBlock, IPolicyContainerBlock } from '@policy-engine/policy-engine.interface';
import { IAuthUser } from '@auth/auth.interface';
import { PolicyInputEventType, PolicyOutputEventType } from '@policy-engine/interfaces';
import { ChildrenType, ControlType } from '@policy-engine/interfaces/block-about';

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
        ]
    }
})
export class InterfaceStepBlock {
    @StateField()
    state: { [key: string]: any } = { index: 0 };

    @ActionCallback({
        output: PolicyOutputEventType.RefreshEvent
    })
    async changeStep(user: IAuthUser, data: any, target: IPolicyBlock) {
        const ref = PolicyComponentsUtils.GetBlockRef(this);
        ref.log(`changeStep`);
        let blockState;
        if (!this.state.hasOwnProperty(user.did)) {
            blockState = {};
            this.state[user.did] = blockState;
        } else {
            blockState = this.state[user.did];
        }

        if (target) {
            blockState.index = ref.children.indexOf(target);
            if (blockState.index === -1) {
                throw new BlockActionError('Bad child block', ref.blockType, ref.uuid);
            }
        } else {
            blockState.index = ref.options.cyclic ? 0 : ref.children.length - 1;
            blockState.data = {};
        }

        ref.updateBlock(blockState, user);
        ref.triggerEvents(PolicyOutputEventType.RefreshEvent, user, null);
    }

    async getData(user: IAuthUser): Promise<any> {
        const ref = PolicyComponentsUtils.GetBlockRef(this);
        let blockState;
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

    public isChildActive(child: AnyBlockType, user: IAuthUser): boolean {
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
}
