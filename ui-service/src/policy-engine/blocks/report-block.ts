import {DataSourceBlock} from '@policy-engine/helpers/decorators/data-source-block';
import {PolicyComponentsStuff} from '@policy-engine/policy-components-stuff';

@DataSourceBlock({
    blockType: 'reportBlock',
    commonBlock: false
})
export class ReportBlock {
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
