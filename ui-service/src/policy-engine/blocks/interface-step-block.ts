import {ContainerBlock, DependenciesUpdateHandler} from '@policy-engine/helpers/decorators';
import {PolicyBlockHelpers} from '@policy-engine/helpers/policy-block-helpers';
import {BlockInitError} from '@policy-engine/errors';
import {StateContainer} from '@policy-engine/state-container';

/**
 * Step block
 */
@ContainerBlock({
    blockType: 'interfaceStepBlock',
    commonBlock: false
})
export class InterfaceStepBlock {
    private init(): void {
        const {options, uuid, blockType} = PolicyBlockHelpers.GetBlockRef(this);

        if (!options.uiMetaData) {
            throw new BlockInitError(`Fileld "uiMetaData" is required`, blockType, uuid);
        }

    }

    @DependenciesUpdateHandler()
    async handler(uuid, state, user, tag) {
        const ref = PolicyBlockHelpers.GetBlockRef(this);
        const blockState = StateContainer.GetBlockState(ref.uuid, user);
        blockState.index = (blockState.index || 0) + 1;
        blockState.data = {};
        if (
            ref.options.cyclic &&
            (blockState.index >= ref.children.length)
        ) {
            blockState.index = 0;
        }
        await StateContainer.SetBlockState(ref.uuid, blockState, user, null, true);

    }

    async getData(user): Promise<any> {
        const ref = PolicyBlockHelpers.GetBlockRef(this);
        const state = StateContainer.GetBlockState(ref.uuid, user);
        if (state.index === undefined) {
            state.index = 0;
        }
        const {options} = ref;
        return {uiMetaData: options.uiMetaData, index: state.index};
    }
}
