import { ContainerBlock } from '../helpers/decorators/container-block.js';
import { PolicyInputEventType } from '../interfaces/index.js';
import { ChildrenType, ControlType } from '../interfaces/block-about.js';
import { PolicyComponentsUtils } from '../policy-components-utils.js';
import { PolicyUser } from '../policy-user.js';
import { LocationType } from '@guardian/interfaces';
import { IPolicyGetData } from '@policy-engine/policy-engine.interface.js';

/**
 * Container block with UI
 */
@ContainerBlock({
    blockType: 'interfaceContainerBlock',
    commonBlock: false,
    actionType: LocationType.LOCAL,
    about: {
        label: 'Container',
        title: `Add 'Container' Block`,
        post: false,
        get: true,
        children: ChildrenType.Any,
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
export class InterfaceContainerBlock {
    /**
     * Get block data
     * @param user
     */
    async getData(user: PolicyUser): Promise<IPolicyGetData> {
        const ref = PolicyComponentsUtils.GetBlockRef(this);
        return {
            id: ref.uuid,
            blockType: ref.blockType,
            actionType: ref.actionType,
            readonly: (
                ref.actionType === LocationType.REMOTE &&
                user.location === LocationType.REMOTE
            ),
            uiMetaData: ref.options?.uiMetaData
        };
    }
}
