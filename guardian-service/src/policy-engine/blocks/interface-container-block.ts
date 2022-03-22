import { IAuthUser } from '@auth/auth.interface';
import {ContainerBlock} from '@policy-engine/helpers/decorators/container-block';
import {PolicyComponentsUtils} from '../policy-components-utils';

/**
 * Container block with UI
 */
@ContainerBlock({
    blockType: 'interfaceContainerBlock',
    commonBlock: false
})
export class InterfaceContainerBlock {
    async getData(user: IAuthUser): Promise<any> {
        const {options} = PolicyComponentsUtils.GetBlockRef(this);
        return {uiMetaData: options.uiMetaData};
    }
}
