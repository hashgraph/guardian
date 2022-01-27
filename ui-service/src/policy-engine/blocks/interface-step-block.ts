import {ContainerBlock, StateField} from '@policy-engine/helpers/decorators';
import {PolicyBlockHelpers} from '@policy-engine/helpers/policy-block-helpers';
import {BlockActionError, BlockInitError} from '@policy-engine/errors';
import {StateContainer} from '@policy-engine/state-container';
import {IPolicyBlock} from '@policy-engine/policy-engine.interface';

/**
 * Step block
 */
@ContainerBlock({
    blockType: 'interfaceStepBlock',
    commonBlock: false
})
export class InterfaceStepBlock {
    state: Map<string, any> = new Map();

    async changeStep(user, data, target) {
        console.log("--- changeStep StepBlock");

        const ref = PolicyBlockHelpers.GetBlockRef(this);
        let blockState;
        if (!this.state.has(user.did)) {
            blockState = {};
            this.state.set(user.did, blockState);
        } else {
            blockState = this.state.get(user.did);
        }

        console.log("--- changeStep StepBlock pre index", blockState.index);

        if (target) {
            blockState.index = ref.children.indexOf(target);
            if (blockState.index === -1) {
                throw new BlockActionError('Bad child block', ref.blockType, ref.uuid);
            }
        } else {
            blockState.index = ref.options.cyclic ? 0 : ref.children.length - 1;
            blockState.data = {};
        }

        console.log("--- changeStep StepBlock post index", blockState.index);

        ref.updateBlock(blockState, user);
    }

    async getData(user): Promise<any> {
        const ref = PolicyBlockHelpers.GetBlockRef(this);
        let blockState;
        if (!this.state.has(user.did)) {
            blockState = {};
            this.state.set(user.did, blockState);
        } else {
            blockState = this.state.get(user.did);
        }
        if (blockState.index === undefined) {
            blockState.index = 0;
        }
        const {options} = ref;
        return {uiMetaData: options.uiMetaData, index: blockState.index};
    }
}
