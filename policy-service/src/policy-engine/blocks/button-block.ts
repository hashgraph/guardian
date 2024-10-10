import { EventBlock } from '../helpers/decorators/index.js';
import { PolicyComponentsUtils } from '../policy-components-utils.js';
import { IPolicyAddonBlock, IPolicyDocument, IPolicyEventState, IPolicyInterfaceBlock } from '../policy-engine.interface.js';
import { ChildrenType, ControlType } from '../interfaces/block-about.js';
import { PolicyInputEventType } from '../interfaces/index.js';
import { PolicyUser } from '../policy-user.js';
import { ExternalDocuments, ExternalEvent, ExternalEventType } from '../interfaces/external-event.js';

/**
 * Document Buttons with UI
 */
@EventBlock({
    blockType: 'buttonBlock',
    commonBlock: false,
    about: {
        label: 'Button',
        title: `Add 'Button' Block`,
        post: true,
        get: true,
        children: ChildrenType.Special,
        control: ControlType.UI,
        input: [
            PolicyInputEventType.RunEvent
        ],
        output: null,
        defaultEvent: false
    },
    variables: []
})
export class ButtonBlock {
    /**
     * Get block data
     * @param user
     */
    async getData(user: PolicyUser): Promise<any> {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyAddonBlock>(this);
        const data: any = {
            id: ref.uuid,
            blockType: ref.blockType,
            type: ref.options.type,
            uiMetaData: ref.options.uiMetaData,
            user: ref.options.user
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
    }): Promise<any> {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyInterfaceBlock>(this);
        const data: IPolicyDocument = blockData.document;
        const state: IPolicyEventState = { data };
        ref.triggerEvents(blockData.tag, user, state);
        PolicyComponentsUtils.ExternalEventFn(new ExternalEvent(ExternalEventType.Set, ref, user, {
            button: blockData.tag,
            documents: ExternalDocuments(blockData.document)
        }));
    }
}
