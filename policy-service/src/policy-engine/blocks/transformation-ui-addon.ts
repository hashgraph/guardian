import { LocationType } from '@guardian/interfaces';
import { ChildrenType, ControlType, PropertyType } from '../interfaces/block-about.js';
import { UIAddon } from '../helpers/decorators/index.js';
import { IPolicyGetData, AnyBlockType } from '../policy-engine.interface.js';
import { PolicyUser } from '../policy-user.js';
import { PolicyComponentsUtils } from '../policy-components-utils.js';

/**
 * Transformation UI Addon
 */
@UIAddon({
    blockType: 'transformationUIAddon',
    actionType: LocationType.REMOTE,
    commonBlock: false,
    about: {
        label: 'Transformation UI Addon',
        title: `Add 'Transformation UI Addon' Block`,
        post: false,
        get: true,
        children: ChildrenType.None,
        control: ControlType.Special,
        input: null,
        output: null,
        defaultEvent: false,
        properties: [
            {
                name: 'expression',
                label: 'Expression',
                title: 'Expression',
                type: PropertyType.Code
            }
        ]
    },
    variables: []
})
export class TransformationUIAddon {

    /**
     * Get block data
     * @param user
     */
    async getData(user: PolicyUser): Promise<IPolicyGetData> {
        const ref = PolicyComponentsUtils.GetBlockRef<AnyBlockType>(this);
        const options = PolicyComponentsUtils.GetBlockUniqueOptionsObject(this);
        return {
            id: ref.uuid,
            blockType: ref.blockType,
            actionType: ref.actionType,
            expression: options.expression,
            readonly: (
                ref.actionType === LocationType.REMOTE &&
                user.location === LocationType.REMOTE
            )
        };
    }
}