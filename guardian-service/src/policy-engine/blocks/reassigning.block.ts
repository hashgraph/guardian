import { BasicBlock } from '@policy-engine/helpers/decorators';
import { Inject } from '@helpers/decorators/inject';
import { KeyType, Wallet } from '@helpers/wallet';
import { PolicyComponentsUtils } from '../policy-components-utils';
import { AnyBlockType, IPolicyBlock } from '@policy-engine/policy-engine.interface';
import { IAuthUser } from '@auth/auth.interface';
import { CatchErrors } from '@policy-engine/helpers/decorators/catch-errors';
import { VcHelper } from '@helpers/vcHelper';
import { Users } from '@helpers/users';

@BasicBlock({
    blockType: 'reassigningBlock',
    commonBlock: false
})
export class ReassigningBlock {
    @Inject()
    private wallet: Wallet;

    @Inject()
    private users: Users;

    @Inject()
    private vcHelper: VcHelper;

    async documentReassigning(state, user: IAuthUser): Promise<any> {
        const ref = PolicyComponentsUtils.GetBlockRef<AnyBlockType>(this);

        const document = state.data;
        const vcDocument = document.document;

        let root: any;
        if (ref.options.issuer == 'owner') {
            root = await this.users.getHederaAccount(document.owner);
        } else if (ref.options.issuer == 'policyOwner') {
            root = await this.users.getHederaAccount(ref.policyOwner);
        } else {
            root = await this.users.getHederaAccount(user.did);
        }
        
        let owner: IAuthUser;
        if (ref.options.actor == 'owner') {
            owner = await this.users.getUserById(document.owner);
        } else if (ref.options.actor == 'issuer') {
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
            relationships: document.messageId ? [document.messageId] : null
        };
        return { item, owner };
    }

    @CatchErrors()
    async runAction(state: any, user: IAuthUser) {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyBlock>(this);
        const { item, owner } = await this.documentReassigning(state, user);
        state.data = item;
        ref.log(`Reassigning Document: ${JSON.stringify(item)}`);
        await ref.runNext(owner, state);
        PolicyComponentsUtils.CallDependencyCallbacks(ref.tag, ref.policyId, user);
        PolicyComponentsUtils.CallParentContainerCallback(ref, user);
        // ref.updateBlock(state, user, '');
    }
}
