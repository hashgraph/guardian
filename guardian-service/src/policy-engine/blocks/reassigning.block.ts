import { ActionCallback, BasicBlock } from '@policy-engine/helpers/decorators';
import { Inject } from '@helpers/decorators/inject';
import { PolicyComponentsUtils } from '@policy-engine/policy-components-utils';
import { AnyBlockType, IPolicyBlock, IPolicyDocument, IPolicyEventState, IPolicyState } from '@policy-engine/policy-engine.interface';
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
     * @param state
     * @param user
     */
    async documentReassigning(document: IPolicyDocument, user: IPolicyUser): Promise<any> {
        const ref = PolicyComponentsUtils.GetBlockRef<AnyBlockType>(this);

        const vcDocument = document.document;

        let root: any;
        if (ref.options.issuer === 'owner') {
            root = await PolicyUtils.getHederaAccount(ref, document.owner);
        } else if (ref.options.issuer === 'policyOwner') {
            root = await PolicyUtils.getHederaAccount(ref, ref.policyOwner);
        } else {
            root = await PolicyUtils.getHederaAccount(ref, user.did);
        }

        let owner: IPolicyUser;
        if (ref.options.actor === 'owner') {
            owner = await PolicyUtils.getPolicyUser(ref, document.owner);
        } else if (ref.options.actor === 'issuer') {
            owner = await PolicyUtils.getPolicyUser(ref, root.did);
        } else {
            owner = user;
        }

        const credentialSubject = vcDocument.credentialSubject[0];
        const vc: any = await this.vcHelper.createVC(root.did, root.hederaAccountKey, credentialSubject);
        const item = ref.databaseServer.createVCRecord(
            ref.policyId,
            ref.tag,
            null,
            vc,
            {
                schema: document.schema,
                type: document.type,
                option: document.option,
                owner: document.owner,
            },
            document
        );

        return { item, owner };
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
                const { item, owner } = await this.documentReassigning(event.data, event.user);
                result.push(item);
                user = owner;
            }
        } else {
            const { item, owner } = await this.documentReassigning(event.data, event.user);
            result = item;
            user = owner;
        }

        event.data.data = result;
        ref.log(`Reassigning Document: ${JSON.stringify(result)}`);

        ref.triggerEvents(PolicyOutputEventType.RunEvent, user, event.data);
        ref.triggerEvents(PolicyOutputEventType.RefreshEvent, user, event.data);
    }
}
