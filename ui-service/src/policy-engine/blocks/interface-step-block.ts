import {ContainerBlock} from '@policy-engine/helpers/decorators';
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
    // private init(): void {
    //     const {options, uuid, blockType} = PolicyBlockHelpers.GetBlockRef(this);
    //     if (!options.uiMetaData) {
    //         throw new BlockInitError(`Field "uiMetaData" is required`, blockType, uuid);
    //     }
    // }

    async changeStep(user, data, target) {
        const ref = PolicyBlockHelpers.GetBlockRef(this);
        let blockState;
        if (!this.state.has(user.did)) {
            blockState = {};
            this.state.set(user.did, blockState);
        } else {
            blockState = this.state.get(user.did);
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
