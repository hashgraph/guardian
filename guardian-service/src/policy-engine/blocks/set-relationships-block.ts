import { ActionCallback, EventBlock } from '@policy-engine/helpers/decorators';
import { PolicyComponentsUtils } from '@policy-engine/policy-components-utils';
import { IPolicyDocument, IPolicyEventState, IPolicyRequestBlock } from '@policy-engine/policy-engine.interface';
import { IPolicyEvent, PolicyInputEventType, PolicyOutputEventType } from '@policy-engine/interfaces';
import { ChildrenType, ControlType, PropertyType } from '@policy-engine/interfaces/block-about';

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
        defaultEvent: true,
        properties: [{
            name: 'includeAccounts',
            label: 'Include Accounts',
            title: 'Include Related Documents Accounts',
            type: PropertyType.Checkbox,
            default: false
        }, {
            name: 'changeOwner',
            label: 'Change Owner',
            title: 'Change Document Owner',
            type: PropertyType.Checkbox,
            default: false
        }]
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
        const owner = data[0] && data[0].owner || null;
        const group = data[0] && data[0].group || null;
        let accounts = {};
        const relationships = [];
        for (const doc of data) {
            accounts = Object.assign(accounts, doc.accounts);
            if (doc.messageId && !relationships.includes(doc.messageId)) {
                relationships.push(doc.messageId);
            }
        }
        accounts = Object.keys(accounts).length ? accounts : null;

        const documents = event.data?.data;
        if (documents) {
            if (Array.isArray(documents)) {
                for (const doc of documents) {
                    doc.relationships = doc.relationships ? doc.relationships.concat(relationships) : relationships;
                    if (doc.accounts && ref.options.includeAccounts) {
                        Object.assign(doc.accounts, accounts);
                    } else if (ref.options.includeAccounts) {
                        doc.accounts = accounts;
                    }
                    if (owner && ref.options.changeOwner) {
                        doc.owner = owner;
                    }
                    if (group && ref.options.changeOwner) {
                        doc.group = group;
                    }
                }
            } else {
                documents.relationships = documents.relationships ? documents.relationships.concat(relationships) : relationships;
                if (documents.accounts && ref.options.includeAccounts) {
                    Object.assign(documents.accounts, accounts);
                } else if (ref.options.includeAccounts) {
                    documents.accounts = accounts;
                }
                if (owner && ref.options.changeOwner) {
                    documents.owner = owner;
                }
                if (group && ref.options.changeOwner) {
                    documents.group = group;
                }
            }
        }

        ref.triggerEvents(PolicyOutputEventType.RunEvent, event.user, event.data);
    }
}
