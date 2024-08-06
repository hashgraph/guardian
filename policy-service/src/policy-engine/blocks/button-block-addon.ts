import { EventBlock } from '../helpers/decorators/index.js';
import { PolicyComponentsUtils } from '../policy-components-utils.js';
import {
    IPolicyAddonBlock,
    IPolicySourceBlock,
} from '../policy-engine.interface.js';
import {
    ChildrenType,
    ControlType,
    PropertyType,
} from '../interfaces/block-about.js';
import { PolicyUser } from '../policy-user.js';

/**
 * Button with UI
 */
@EventBlock({
    blockType: 'buttonBlockAddon',
    commonBlock: false,
    about: {
        label: 'Button',
        title: `Add 'Button' Block`,
        post: true,
        get: true,
        children: ChildrenType.Special,
        control: ControlType.Special,
        input: null,
        output: null,
        defaultEvent: false,
        properties: [
            {
                name: 'name',
                label: 'Button Name',
                title: 'Button Name',
                type: PropertyType.Input,
                required: true,
            },
            {
                name: 'uiClass',
                label: 'UI Class',
                title: 'UI Class',
                type: PropertyType.Input,
            },
            {
                name: 'dialog',
                label: 'Dialog',
                title: 'Dialog',
                type: PropertyType.Checkbox,
                default: false,
            },
            {
                name: 'dialogOptions',
                label: 'Dialog Options',
                title: 'Dialog Options',
                type: PropertyType.Group,
                properties: [
                    {
                        name: 'dialogTitle',
                        label: 'Dialog Title',
                        title: 'Dialog Title',
                        type: PropertyType.Input,
                        required: true,
                    },
                    {
                        name: 'dialogDescription',
                        label: 'Dialog Description',
                        title: 'Dialog Description',
                        type: PropertyType.Input,
                        required: true,
                    },
                    {
                        name: 'dialogResultFieldPath',
                        label: 'Dialog Result Field Path',
                        title: 'Dialog Result Field Path',
                        type: PropertyType.Path,
                        required: true,
                        default: 'option.comment',
                    },
                ],
                visible: 'dialog === true',
            },
        ],
    },
    variables: [],
})
export class ButtonBlockAddon {
    /**
     * Get block data
     * @param user
     */
    async getData(): Promise<any> {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyAddonBlock>(this);
        const data: any = {
            id: ref.uuid,
            blockType: ref.blockType,
            ...ref.options,
        };
        return data;
    }

    /**
     * Set block data
     * @param user
     * @param blockData
     */
    async setData(
        user: PolicyUser,
        blockData: {
            documentId: string;
            dialogResult: string;
        }
    ): Promise<any> {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyAddonBlock>(this);
        const parent = PolicyComponentsUtils.GetBlockRef<IPolicySourceBlock>(
            ref.parent
        );
        await parent.onAddonEvent(
            user,
            ref.tag,
            blockData.documentId,
            ref.options.dialog
                ? {
                      field: ref.options.dialogOptions.dialogResultFieldPath,
                      value: blockData.dialogResult,
                  }
                : null
        );
    }
}
