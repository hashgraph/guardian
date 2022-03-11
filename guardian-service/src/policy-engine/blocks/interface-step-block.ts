import { ContainerBlock, StateField } from '@policy-engine/helpers/decorators';
import { BlockActionError } from '@policy-engine/errors';
import { PolicyComponentsUtils } from '../policy-components-utils';
import { AnyBlockType, IPolicyContainerBlock } from '@policy-engine/policy-engine.interface';
import { IAuthUser } from '@auth/auth.interface';

/**
 * Step block
 */
@ContainerBlock({
    blockType: 'interfaceStepBlock',
    commonBlock: false
})
export class InterfaceStepBlock {
    @StateField()
    state: { [key: string]: any } = { index: 0 };

    async changeStep(user: IAuthUser, data:any, target:any) {
        const ref = PolicyComponentsUtils.GetBlockRef(this);
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
