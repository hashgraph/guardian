import {DataSourceBlock} from '@policy-engine/helpers/decorators/data-source-block';
import {PolicyComponentsUtils} from '../policy-components-utils';

@DataSourceBlock({
    blockType: 'informationBlock',
    commonBlock: false
})
export class InformationBlock {
    // private init(): void {
    //     const {options, uuid, blockType} = PolicyComponentsUtils.GetBlockRef(this);
    //     if (!options.uiMetaData) {
    //         throw new BlockInitError(`Field "uiMetaData" is required`, blockType, uuid);
    //     }
    // }

    async getData(user): Promise<any> {
        const {options} = PolicyComponentsUtils.GetBlockRef(this);
        return {uiMetaData: options.uiMetaData};
    }
}
