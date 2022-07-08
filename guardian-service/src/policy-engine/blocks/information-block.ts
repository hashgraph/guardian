import { DataSourceBlock } from '@policy-engine/helpers/decorators/data-source-block';
import { PolicyInputEventType } from '@policy-engine/interfaces';
import { ChildrenType, ControlType } from '@policy-engine/interfaces/block-about';
import { PolicyComponentsUtils } from '@policy-engine/policy-components-utils';
import { IAuthUser } from '@guardian/common';

/**
 * Information block
 */
@DataSourceBlock({
    blockType: 'informationBlock',
    commonBlock: false,
    about: {
        label: 'Information',
        title: `Add 'Information' Block`,
        post: false,
        get: true,
        children: ChildrenType.None,
        control: ControlType.UI,
        input: [
            PolicyInputEventType.RunEvent,
            PolicyInputEventType.RefreshEvent,
        ],
        output: null,
        defaultEvent: false
    }
})
export class InformationBlock {
    /**
     * Get block data
     * @param user
     */
    async getData(user: IAuthUser): Promise<any> {
        const {options} = PolicyComponentsUtils.GetBlockRef(this);
        return {uiMetaData: options.uiMetaData};
    }
}
