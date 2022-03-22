import { IAuthUser } from '@auth/auth.interface';
import { DataSourceBlock } from '@policy-engine/helpers/decorators/data-source-block';
import { PolicyComponentsUtils } from '../policy-components-utils';

@DataSourceBlock({
    blockType: 'informationBlock',
    commonBlock: false
})
export class InformationBlock {
    async getData(user: IAuthUser): Promise<any> {
        const { options } = PolicyComponentsUtils.GetBlockRef(this);
        return { uiMetaData: options.uiMetaData };
    }
}
