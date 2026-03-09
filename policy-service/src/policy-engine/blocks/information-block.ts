import { DataSourceBlock } from '../helpers/decorators/data-source-block.js';
import { PolicyInputEventType } from '../interfaces/index.js';
import { ChildrenType, ControlType, PropertyType } from '../interfaces/block-about.js';
import { PolicyComponentsUtils } from '../policy-components-utils.js';
import { PolicyUser } from '../policy-user.js';
import { LocationType } from '@guardian/interfaces';
import { IPolicyGetData } from '@policy-engine/policy-engine.interface.js';

/**
 * Information block
 */
@DataSourceBlock({
    blockType: 'informationBlock',
    commonBlock: false,
    actionType: LocationType.LOCAL,
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
        defaultEvent: false,
        properties: [{
            name: 'uiMetaData',
            label: 'UI',
            title: 'UI Properties',
            type: PropertyType.Group,
            editable: true,
            properties: [{
                name: 'title',
                label: 'Title',
                title: 'Title',
                type: PropertyType.Input,
                editable: true
            },
            {
                name: 'description',
                label: 'Description',
                title: 'Description',
                type: PropertyType.Input,
                editable: true
            },{
                name: 'type',
                label: 'Type',
                title: 'Type',
                type: PropertyType.Select,
                items: [
                    { label: 'LOADER', value: 'loader'},
                    { label: 'TEXT', value: 'text'}
                ],
                editable: true,
            }]
        }]
    },
    variables: []
})
export class InformationBlock {
    /**
     * Get block data
     * @param user
     */
    async getData(user: PolicyUser): Promise<IPolicyGetData> {
        const ref = PolicyComponentsUtils.GetBlockRef(this);
        const options = await ref.getOptions(user);

        return {
            id: ref.uuid,
            blockType: ref.blockType,
            actionType: ref.actionType,
            readonly: (
                ref.actionType === LocationType.REMOTE &&
                user.location === LocationType.REMOTE
            ),
            uiMetaData: options?.uiMetaData
        };
    }
}
