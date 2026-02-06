import { EventBlock } from '../helpers/decorators/index.js';
import { LocationType } from '@guardian/interfaces';
import { IPolicyAddonBlock, IPolicyDocument, IPolicyEventState, IPolicyGetData, IPolicyInterfaceBlock } from '../policy-engine.interface.js';
import { ChildrenType, ControlType, PropertyType } from '../interfaces/block-about.js';
import { PolicyInputEventType, PolicyOutputEventType } from '../interfaces/index.js';
import { PolicyComponentsUtils } from '../policy-components-utils.js';
import { PolicyUser } from '../policy-user.js';
import { ExternalDocuments, ExternalEvent, ExternalEventType } from '../interfaces/external-event.js';

/**
 * Document action clock with UI
 */
@EventBlock({
    blockType: 'transformationButtonBlock',
    commonBlock: false,
    actionType: LocationType.REMOTE,
    about: {
        label: 'Transformation button',
        title: `Add 'Transformation button' Block`,
        post: true,
        get: true,
        children: ChildrenType.Special,
        control: ControlType.UI,
        input: [
            PolicyInputEventType.RunEvent,
        ],
        output: [
            PolicyOutputEventType.GetDataEvent
        ],
        defaultEvent: false,
        properties: [
            {
                'name': 'buttonName',
                'label': 'Button name',
                'title': 'Button name',
                'type': PropertyType.Input,
                'default': ''
            },
            {
                'name': 'url',
                'label': 'Url',
                'title': 'Url',
                'type': PropertyType.Input,
                'default': ''
            },
            {
                'name': 'hideWhenDiscontinued',
                'label': 'Hide when discontinued',
                'title': 'Hide when discontinued',
                'type': PropertyType.Checkbox,
                'default': false
            },
        ]
    },
    variables: [
        { path: 'options.schema', alias: 'schema', type: 'Schema' }
    ]
})
export class TransformationButtonBlock {
    /**
     * Get block data
     * @param user
     */
    async getData(user: PolicyUser): Promise<IPolicyGetData> {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyAddonBlock>(this);
        const data: IPolicyGetData = {
            id: ref.uuid,
            blockType: ref.blockType,
            actionType: ref.actionType,
            readonly: (
                ref.actionType === LocationType.REMOTE &&
                user.location === LocationType.REMOTE
            ),
            type: ref.options.type,
            uiMetaData: ref.options.uiMetaData,
            user: ref.options.user,
            buttonName: ref.options.buttonName,
            hideWhenDiscontinued: !!ref.options.hideWhenDiscontinued,
        }
        return data;
    }

    /**
     * Set block data
     * @param user
     * @param blockData
     */
    async setData(user: PolicyUser, blockData: {
        /**
         * Document
         */
        document: any,
        /**
         * Tag
         */
        tag: any
    }, _, actionStatus): Promise<any> {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyInterfaceBlock>(this);
        const data: IPolicyDocument = blockData.document;
        const state: IPolicyEventState = { data };
        const eventData = await ref.triggerEventSync(PolicyInputEventType.GetDataEvent, user, state, actionStatus);
        PolicyComponentsUtils.ExternalEventFn(new ExternalEvent(ExternalEventType.Set, ref, user, {
            button: blockData.tag,
            documents: ExternalDocuments(blockData.document)
        }));
        ref.backup();

        return {
            data: eventData,
            url: ref.options?.url ?? ''
        };
    }
}
