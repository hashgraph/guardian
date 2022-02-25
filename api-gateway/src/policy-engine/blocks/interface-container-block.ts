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
    async getData(user): Promise<any> {
        const {options} = PolicyComponentsStuff.GetBlockRef(this);
        return {uiMetaData: options.uiMetaData};
    }
}
