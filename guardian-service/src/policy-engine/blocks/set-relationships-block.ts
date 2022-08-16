import { ActionCallback, EventBlock } from '@policy-engine/helpers/decorators';
import { PolicyComponentsUtils } from '@policy-engine/policy-components-utils';
import { IPolicyDocument, IPolicyEventState, IPolicyRequestBlock, IPolicyState } from '@policy-engine/policy-engine.interface';
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
    async runAction(event: IPolicyEvent<IPolicyEventState>) {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyRequestBlock>(this);
        const data: IPolicyDocument[] = await ref.getSources(event.user);
        const relationships = [];
        for (const doc of data) {
            if (doc.messageId && !relationships.includes(doc.messageId)) {
                relationships.push(doc.messageId);
            }
        }

        const documents = event.data?.data;
        if (documents) {
            if (Array.isArray(documents)) {
                for (const doc of documents) {
                    doc.relationships = doc.relationships ? doc.relationships.concat(relationships) : relationships;
                }
            } else {
                documents.relationships = documents.relationships ? documents.relationships.concat(relationships) : relationships;
            }
        }

        ref.triggerEvents(PolicyOutputEventType.RunEvent, event.user, event.data);
    }
}
