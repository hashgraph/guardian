import { ActionCallback, BasicBlock } from '../helpers/decorators/index.js';
import { VcHelper } from '@guardian/common';
import { PolicyComponentsUtils } from '../policy-components-utils.js';
import { AnyBlockType, IPolicyBlock, IPolicyDocument, IPolicyEventState } from '../policy-engine.interface.js';
import { CatchErrors } from '../helpers/decorators/catch-errors.js';
import { IPolicyEvent, PolicyInputEventType, PolicyOutputEventType } from '../interfaces/index.js';
import { ChildrenType, ControlType } from '../interfaces/block-about.js';
import { PolicyUser } from '../policy-user.js';
import { PolicyUtils } from '../helpers/utils.js';
import { ExternalDocuments, ExternalEvent, ExternalEventType } from '../interfaces/external-event.js';
import { Inject } from '../../helpers/decorators/inject.js';
import { LocationType } from '@guardian/interfaces';
import { PolicyActionsUtils } from '../policy-actions/utils.js';
import { RecordActionStep } from '../record-action-step.js';

/**
 * Reassigning block
 */
@BasicBlock({
    blockType: 'reassigningBlock',
    commonBlock: false,
    actionType: LocationType.REMOTE,
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
     * @param userId
     */
    async documentReassigning(document: IPolicyDocument, user: PolicyUser, userId: string | null, actionStatus: RecordActionStep): Promise<{
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
        const owner: PolicyUser = await PolicyUtils.getDocumentOwner(ref, document, userId);
        const relayerAccount = await PolicyUtils.getDocumentRelayerAccount(ref, document, user.userId);

        let groupContext: any;
        let issuer: string;
        if (ref.options.issuer === 'owner') {
            const cred = await PolicyUtils.getUserCredentials(ref, document.owner, userId);
            issuer = cred.did;
            groupContext = await PolicyUtils.getGroupContext(ref, owner);
        } else if (ref.options.issuer === 'policyOwner') {
            const cred = await PolicyUtils.getUserCredentials(ref, ref.policyOwner, userId);
            issuer = cred.did;
            groupContext = null;
        } else {
            const cred = await PolicyUtils.getUserCredentials(ref, user.did, userId);
            issuer = cred.did;
            groupContext = await PolicyUtils.getGroupContext(ref, user);
        }

        let actor: PolicyUser;
        if (ref.options.actor === 'owner') {
            actor = await PolicyUtils.getDocumentOwner(ref, document, userId);
        } else if (ref.options.actor === 'issuer') {
            actor = await PolicyUtils.getPolicyUser(ref, issuer, document.group, userId);
        } else {
            actor = user;
        }

        const uuid = await ref.components.generateUUID(actionStatus?.id);
        const credentialSubject = document.document.credentialSubject[0];
        const vc = await PolicyActionsUtils.signVC({
            ref,
            subject: credentialSubject,
            issuer,
            relayerAccount,
            options: { uuid, group: groupContext },
            userId: user.userId
        });

        let item = PolicyUtils.createVC(ref, owner, vc, actionStatus?.id);
        item.type = document.type;
        item.schema = document.schema;
        item.assignedTo = document.assignedTo;
        item.assignedToGroup = document.assignedToGroup;
        item.option = Object.assign({}, document.option);
        item.startMessageId = document.startMessageId;
        item.relayerAccount = relayerAccount;
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
                const { item, actor } = await this.documentReassigning(doc, event.user, event?.user?.userId, event.actionStatus);
                result.push(item);
                user = actor;
            }
        } else {
            const { item, actor } = await this.documentReassigning(documents, event.user, event?.user?.userId, event.actionStatus);
            result = item;
            user = actor;
        }

        event.data.data = result;
        // ref.log(`Reassigning Document: ${JSON.stringify(result)}`);

        await ref.triggerEvents(PolicyOutputEventType.RunEvent, user, event.data, event.actionStatus);
        await ref.triggerEvents(PolicyOutputEventType.ReleaseEvent, user, null, event.actionStatus);
        await ref.triggerEvents(PolicyOutputEventType.RefreshEvent, user, event.data, event.actionStatus);

        PolicyComponentsUtils.ExternalEventFn(new ExternalEvent(ExternalEventType.Run, ref, user, {
            documents: ExternalDocuments(result)
        }));
        ref.backup();

        return event.data;
    }
}
