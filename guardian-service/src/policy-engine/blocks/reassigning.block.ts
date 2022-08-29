import { ActionCallback, BasicBlock } from '@policy-engine/helpers/decorators';
import { Inject } from '@helpers/decorators/inject';
import { PolicyComponentsUtils } from '@policy-engine/policy-components-utils';
import { AnyBlockType, IPolicyBlock, IPolicyDocument, IPolicyEventState } from '@policy-engine/policy-engine.interface';
import { CatchErrors } from '@policy-engine/helpers/decorators/catch-errors';
import { VcHelper } from '@helpers/vc-helper';
import { IPolicyEvent, PolicyInputEventType, PolicyOutputEventType } from '@policy-engine/interfaces';
import { ChildrenType, ControlType } from '@policy-engine/interfaces/block-about';
import { IPolicyUser } from '@policy-engine/policy-user';
import { PolicyUtils } from '@policy-engine/helpers/utils';

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
            PolicyOutputEventType.RefreshEvent
        ],
        defaultEvent: true
    }
})
export class ReassigningBlock {
    /**
     * VC helper
     * @private
     */
    @Inject()
    private readonly vcHelper: VcHelper;

    /**
     * Document reassigning
     * @param document
     * @param user
     */
    async documentReassigning(document: IPolicyDocument, user: IPolicyUser): Promise<{
        /**
         * New Document
         */
        item: IPolicyDocument,
        /**
         * New Actor
         */
        actor: IPolicyUser
    }> {
        const ref = PolicyComponentsUtils.GetBlockRef<AnyBlockType>(this);
        const vcDocument = document.document;
        const owner: IPolicyUser = PolicyUtils.getDocumentOwner(ref, document);

        let root: any;
        let groupContext: any;
        if (ref.options.issuer === 'owner') {
            root = await PolicyUtils.getHederaAccount(ref, document.owner);
            groupContext = await PolicyUtils.getGroupContext(ref, owner);
        } else if (ref.options.issuer === 'policyOwner') {
            root = await PolicyUtils.getHederaAccount(ref, ref.policyOwner);
            groupContext = null;
        } else {
            root = await PolicyUtils.getHederaAccount(ref, user.did);
            groupContext = await PolicyUtils.getGroupContext(ref, user);
        }

        let actor: IPolicyUser;
        if (ref.options.actor === 'owner') {
            actor = PolicyUtils.getDocumentOwner(ref, document);
        } else if (ref.options.actor === 'issuer') {
            actor = PolicyUtils.getPolicyUser(ref, root.did, document.group);
        } else {
            actor = user;
        }

        const credentialSubject = vcDocument.credentialSubject[0];
        const vc: any = await this.vcHelper.createVC(
            root.did,
            root.hederaAccountKey,
            credentialSubject,
            groupContext
        );

        let item = PolicyUtils.createVC(ref, owner, vc);
        item.type = document.type;
        item.schema = document.schema;
        item.option = document.option;
        item = PolicyUtils.setDocumentRef(item, document);

        return { item, actor };
    }

    /**
     * Run block action
     * @event PolicyEventType.Run
     * @param {IPolicyEvent} event
     */
    @ActionCallback({
        output: [PolicyOutputEventType.RunEvent, PolicyOutputEventType.RefreshEvent]
    })
    @CatchErrors()
    async runAction(event: IPolicyEvent<IPolicyEventState>) {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyBlock>(this);
        const documents = event?.data?.data;

        let result: IPolicyDocument | IPolicyDocument[];
        let user: IPolicyUser;
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
        ref.triggerEvents(PolicyOutputEventType.RefreshEvent, user, event.data);
    }
}