import {DataSourceBlock} from '@policy-engine/helpers/decorators/data-source-block';
import {PolicyBlockHelpers} from '@policy-engine/helpers/policy-block-helpers';
import {BlockInitError} from '@policy-engine/errors';

@DataSourceBlock({
    blockType: 'informationBlock',
    commonBlock: false
})
export class InformationBlock {
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
