import { ActionCallback, BasicBlock } from '../helpers/decorators/index.js';
import { VcHelper } from '@guardian/common';
import { PolicyComponentsUtils } from '../policy-components-utils.js';
import { AnyBlockType, IPolicyBlock, IPolicyDocument, IPolicyEventState } from '../policy-engine.interface.js';
import { CatchErrors } from '../helpers/decorators/catch-errors.js';
import { IPolicyEvent, PolicyInputEventType, PolicyOutputEventType } from '../interfaces/index.js';
import { ChildrenType, ControlType } from '../interfaces/block-about.js';
import { PolicyUser, UserCredentials } from '../policy-user.js';
import { PolicyUtils } from '../helpers/utils.js';
import { ExternalDocuments, ExternalEvent, ExternalEventType } from '../interfaces/external-event.js';
import { Inject } from '../../helpers/decorators/inject.js';

/**
 * Reassigning block
 */
@BasicBlock({
    blockType: 'reassigningBlock',
    commonBlock: false,
    about: {
        label: 'Reassigning',
        title: `Add 'Reassigning' Block`,
        post: false,
        get: false,
        children: ChildrenType.None,
        control: ControlType.Server,
        input: [
            PolicyInputEventType.RunEvent
        ],
        output: [
            PolicyOutputEventType.RunEvent,
            PolicyOutputEventType.RefreshEvent,
            PolicyOutputEventType.ErrorEvent
        ],
        defaultEvent: true
    },
    variables: []
})
export class ReassigningBlock {
    /**
     * VC helper
     * @private
     */
    @Inject()
    declare private vcHelper: VcHelper;

    /**
     * Document reassigning
     * @param document
     * @param user
     */
    async documentReassigning(document: IPolicyDocument, user: PolicyUser): Promise<{
        /**
         * New Document
         */
        item: IPolicyDocument,
        /**
         * New Actor
         */
        actor: PolicyUser
    }> {
        const ref = PolicyComponentsUtils.GetBlockRef<AnyBlockType>(this);
        const vcDocument = document.document;
        const owner: PolicyUser = await PolicyUtils.getDocumentOwner(ref, document);

        let root: UserCredentials;
        let groupContext: any;

        if (ref.options.issuer === 'owner') {
            root = await PolicyUtils.getUserCredentials(ref, document.owner);
            groupContext = await PolicyUtils.getGroupContext(ref, owner);
        } else if (ref.options.issuer === 'policyOwner') {
            root = await PolicyUtils.getUserCredentials(ref, ref.policyOwner);
            groupContext = null;
        } else {
            root = await PolicyUtils.getUserCredentials(ref, user.did);
            groupContext = await PolicyUtils.getGroupContext(ref, user);
        }

        let actor: PolicyUser;
        if (ref.options.actor === 'owner') {
            actor = await PolicyUtils.getDocumentOwner(ref, document);
        } else if (ref.options.actor === 'issuer') {
            actor = await PolicyUtils.getPolicyUser(ref, root.did, document.group);
        } else {
            actor = user;
        }

        const didDocument = await root.loadDidDocument(ref);
        const uuid = await ref.components.generateUUID();
        const credentialSubject = vcDocument.credentialSubject[0];
        const vc: any = await this.vcHelper.createVerifiableCredential(
            credentialSubject,
            didDocument,
            null,
            { uuid, group: groupContext }
        );

        let item = PolicyUtils.createVC(ref, owner, vc);
        item.type = document.type;
        item.schema = document.schema;
        item.assignedTo = document.assignedTo;
        item.assignedToGroup = document.assignedToGroup;
        item.option = Object.assign({}, document.option);
        item = PolicyUtils.setDocumentRef(item, document);

        return { item, actor };
    }

    /**
     * Run block action
     * @event PolicyEventType.Run
     * @param {IPolicyEvent} event
     */
    @ActionCallback({
        output: [
            PolicyOutputEventType.RunEvent,
            PolicyOutputEventType.RefreshEvent,
            PolicyOutputEventType.ErrorEvent
        ]
    })
    @CatchErrors()
    async runAction(event: IPolicyEvent<IPolicyEventState>) {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyBlock>(this);
        const documents = event?.data?.data;

        let result: IPolicyDocument | IPolicyDocument[];
        let user: PolicyUser;
        if (Array.isArray(documents)) {
            result = [];
            for (const doc of documents) {
                const { item, actor } = await this.documentReassigning(doc, event.user);
                result.push(item);
                user = actor;
            }
        } else {
            const { item, actor } = await this.documentReassigning(documents, event.user);
            result = item;
            user = actor;
        }

        event.data.data = result;
        ref.log(`Reassigning Document: ${JSON.stringify(result)}`);

        ref.triggerEvents(PolicyOutputEventType.RunEvent, user, event.data);
        ref.triggerEvents(PolicyOutputEventType.ReleaseEvent, user, null);
        ref.triggerEvents(PolicyOutputEventType.RefreshEvent, user, event.data);

        PolicyComponentsUtils.ExternalEventFn(new ExternalEvent(ExternalEventType.Run, ref, user, {
            documents: ExternalDocuments(result)
        }));
    }
}
