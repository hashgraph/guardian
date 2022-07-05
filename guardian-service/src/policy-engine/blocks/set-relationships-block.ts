import { ActionCallback, EventBlock } from '@policy-engine/helpers/decorators';
import { PolicyComponentsUtils } from '../policy-components-utils';
import { IPolicyRequestBlock } from '@policy-engine/policy-engine.interface';
import { IPolicyEvent, PolicyInputEventType, PolicyOutputEventType } from '@policy-engine/interfaces';
import { ChildrenType, ControlType } from '@policy-engine/interfaces/block-about';

/**
 * Set document relationships action
 */
@EventBlock({
    blockType: 'setRelationshipsBlock',
    commonBlock: false,
    about: {
        label: 'Set Relationships',
        title: `Add 'Relationships' Block`,
        post: false,
        get: false,
        children: ChildrenType.Special,
        control: ControlType.Server,
        input: [
            PolicyInputEventType.RunEvent
        ],
        output: [
            PolicyOutputEventType.RunEvent
        ],
        defaultEvent: true
    }
})
export class SetRelationshipsBlock {
    /**
     * Run block action
     * @param event
     */
    @ActionCallback({
        output: [PolicyOutputEventType.RunEvent]
    })
    async runAction(event: IPolicyEvent<any>) {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyRequestBlock>(this);
        const data: any[] = await ref.getSources(event.user);
        const relationships = [];
        for (const doc of data) {
            if (doc.messageId && !relationships.includes(doc.messageId)) {
                relationships.push(doc.messageId);
            }
        }
        const document: any = event.data?.data;
        if (document) {
            document.relationships = document.relationships ? document.relationships.concat(relationships) : relationships;
        }

        ref.triggerEvents(PolicyOutputEventType.RunEvent, event.user, event.data);
    }
}
