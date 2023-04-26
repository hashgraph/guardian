import { ActionCallback, BasicBlock } from '@policy-engine/helpers/decorators';
import { PolicyComponentsUtils } from '@policy-engine/policy-components-utils';
import { IPolicyDocument, IPolicyEventState, IPolicyRequestBlock } from '@policy-engine/policy-engine.interface';
import { IPolicyEvent, PolicyInputEventType, PolicyOutputEventType } from '@policy-engine/interfaces';
import { ChildrenType, ControlType, PropertyType } from '@policy-engine/interfaces/block-about';
import { ExternalDocuments, ExternalEvent, ExternalEventType } from '@policy-engine/interfaces/external-event';

/**
 * Set document relationships action
 */
@BasicBlock({
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
            name: 'includeTokens',
            label: 'Include Tokens',
            title: 'Include Related Documents Tokens',
            type: PropertyType.Checkbox,
            default: false
        }, {
            name: 'changeOwner',
            label: 'Change Owner',
            title: 'Change Document Owner',
            type: PropertyType.Checkbox,
            default: false
        }]
    },
    variables: []
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
        let tokens = {};
        const relationships = [];
        for (const doc of data) {
            accounts = Object.assign(accounts, doc.accounts);
            tokens = Object.assign(tokens, doc.tokens);
            if (doc.messageId && !relationships.includes(doc.messageId)) {
                relationships.push(doc.messageId);
            }
        }
        accounts = Object.keys(accounts).length ? accounts : null;

        const documents = event.data?.data;
        if (documents) {
            if (Array.isArray(documents)) {
                for (const doc of documents) {
                    doc.relationships = doc.relationships
                        ? doc.relationships.concat(relationships)
                        : relationships;
                    if (ref.options.includeAccounts) {
                        doc.accounts = doc.accounts
                            ? Object.assign(doc.accounts, accounts)
                            : accounts;
                    }
                    if (ref.options.includeTokens) {
                        doc.tokens = doc.tokens
                            ? Object.assign(doc.tokens, tokens)
                            : tokens;
                    }
                    if (owner && ref.options.changeOwner) {
                        doc.owner = owner;
                    }
                    if (group && ref.options.changeOwner) {
                        doc.group = group;
                    }
                }
            } else {
                documents.relationships = documents.relationships
                    ? documents.relationships.concat(relationships)
                    : relationships;
                if (ref.options.includeAccounts) {
                    documents.accounts = Object.assign(
                        {},
                        documents.accounts,
                        accounts
                    );
                }
                if (ref.options.includeTokens) {
                    documents.tokens = Object.assign(
                        {},
                        documents.tokens,
                        tokens
                    );
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
        ref.triggerEvents(PolicyOutputEventType.ReleaseEvent, event.user, null);

        PolicyComponentsUtils.ExternalEventFn(new ExternalEvent(ExternalEventType.Run, ref, event?.user, {
            documents: ExternalDocuments(event.data?.data),
        }));
    }
}
