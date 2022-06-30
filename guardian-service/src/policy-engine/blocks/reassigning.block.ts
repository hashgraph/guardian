import { ActionCallback, BasicBlock } from '@policy-engine/helpers/decorators';
import { Inject } from '@helpers/decorators/inject';
import { KeyType, Wallet } from '@helpers/wallet';
import { PolicyComponentsUtils } from '../policy-components-utils';
import { AnyBlockType, IPolicyBlock } from '@policy-engine/policy-engine.interface';
import { CatchErrors } from '@policy-engine/helpers/decorators/catch-errors';
import { VcHelper } from '@helpers/vcHelper';
import { Users } from '@helpers/users';
import { IPolicyEvent, PolicyInputEventType, PolicyOutputEventType } from '@policy-engine/interfaces';
import { ChildrenType, ControlType } from '@policy-engine/interfaces/block-about';
import { IAuthUser } from '@guardian/common';

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
     * Wallet helper
     * @private
     */
    @Inject()
    private wallet: Wallet;

    /**
     * Users helper
     * @private
     */
    @Inject()
    private users: Users;

    /**
     * VC helper
     * @private
     */
    @Inject()
    private vcHelper: VcHelper;

    /**
     * Document reassigning
     * @param state
     * @param user
     */
    async documentReassigning(state, user: IAuthUser): Promise<any> {
        const ref = PolicyComponentsUtils.GetBlockRef<AnyBlockType>(this);

        const document = state.data;
        const vcDocument = document.document;

        let root: any;
        if (ref.options.issuer === 'owner') {
            root = await this.users.getHederaAccount(document.owner);
        } else if (ref.options.issuer === 'policyOwner') {
            root = await this.users.getHederaAccount(ref.policyOwner);
        } else {
            root = await this.users.getHederaAccount(user.did);
        }

        let owner: IAuthUser;
        if (ref.options.actor === 'owner') {
            owner = await this.users.getUserById(document.owner);
        } else if (ref.options.actor === 'issuer') {
            owner = await this.users.getUserById(root.did);
        } else {
            owner = user;
        }

        const credentialSubject = vcDocument.credentialSubject[0];
        const vc: any = await this.vcHelper.createVC(root.did, root.hederaAccountKey, credentialSubject);
        const item = {
            hash: vc.toCredentialHash(),
            document: vc.toJsonTree(),
            schema: document.schema,
            type: document.type,
            option: document.option,
            owner: document.owner,
            policyId: ref.policyId,
            tag: ref.tag,
            messageId: null,
            topicId: null,
            relationships: document.messageId ? [document.messageId] : null
        };
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
