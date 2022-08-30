import { ActionCallback, BasicBlock } from '@policy-engine/helpers/decorators';
import { Inject } from '@helpers/decorators/inject';
import { PolicyComponentsUtils } from '@policy-engine/policy-components-utils';
import { AnyBlockType, IPolicyBlock } from '@policy-engine/policy-engine.interface';
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
    async documentReassigning(state, user: IPolicyUser): Promise<any> {
        const ref = PolicyComponentsUtils.GetBlockRef<AnyBlockType>(this);

        const document = state.data;
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
    async runAction(event: IPolicyEvent<any>) {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyBlock>(this);
        const { item, owner } = await this.documentReassigning(event.data, event.user);
        event.data.data = item;
        ref.log(`Reassigning Document: ${JSON.stringify(item)}`);

        ref.triggerEvents(PolicyOutputEventType.RunEvent, owner, event.data);
        ref.triggerEvents(PolicyOutputEventType.RefreshEvent, owner, event.data);
    }
}
