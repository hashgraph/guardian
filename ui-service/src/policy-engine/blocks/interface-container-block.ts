import {BlockInitError} from '@policy-engine/errors';
import {ContainerBlock} from '@policy-engine/helpers/decorators/container-block';
import {PolicyBlockHelpers} from '@policy-engine/helpers/policy-block-helpers';

/**
 * Container block with UI
 */
@ContainerBlock({
    blockType: 'interfaceContainerBlock',
    commonBlock: false
})
export class InterfaceContainerBlock {
    private init(): void {
        const {options, uuid, blockType} = PolicyBlockHelpers.GetBlockRef(this);

        if (!options.uiMetaData) {
            throw new BlockInitError(`Fileld "uiMetaData" is required`, blockType, uuid);
        }
    }

    async getData(user): Promise<any> {
        const {options} = PolicyBlockHelpers.GetBlockRef(this);
        return {uiMetaData: options.uiMetaData};
    }
}
