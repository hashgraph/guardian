import {ContainerBlock} from '@policy-engine/helpers/decorators/container-block';
import {PolicyComponentsStuff} from '@policy-engine/policy-components-stuff';

/**
 * Container block with UI
 */
@ContainerBlock({
    blockType: 'interfaceContainerBlock',
    commonBlock: false
})
export class InterfaceContainerBlock {
    // private init(): void {
    //     const {options, uuid, blockType} = PolicyComponentsStuff.GetBlockRef(this);
    //     if (!options.uiMetaData) {
    //         throw new BlockInitError(`Field "uiMetaData" is required`, blockType, uuid);
    //     }
    // }

    async getData(user): Promise<any> {
        const {options} = PolicyComponentsStuff.GetBlockRef(this);
        return {uiMetaData: options.uiMetaData};
    }
}
