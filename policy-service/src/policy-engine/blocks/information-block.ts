import { DataSourceBlock } from '../helpers/decorators/data-source-block.js';
import { PolicyInputEventType } from '../interfaces/index.js';
import { ChildrenType, ControlType } from '../interfaces/block-about.js';
import { PolicyComponentsUtils } from '../policy-components-utils.js';
import { IPolicyUser } from '../policy-user.js';

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
    },
    variables: []
})
export class InformationBlock {
    /**
     * Get block data
     * @param user
     */
    async getData(user: IPolicyUser): Promise<any> {
        const {options} = PolicyComponentsUtils.GetBlockRef(this);
        return {uiMetaData: options.uiMetaData};
    }
}
