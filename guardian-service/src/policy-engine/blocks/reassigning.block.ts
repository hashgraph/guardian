import { BasicBlock } from '@policy-engine/helpers/decorators';
import { Inject } from '@helpers/decorators/inject';
import { KeyType, Wallet } from '@helpers/wallet';
import { PolicyComponentsUtils } from '../policy-components-utils';
import { IPolicyBlock } from '@policy-engine/policy-engine.interface';
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
        const userHederaKey = await this.wallet.getKey(user.walletToken, KeyType.KEY, user.did);
        const vcDocument = state.data.document;
        const credentialSubject = vcDocument.credentialSubject[0];

        const vc: any = await this.vcHelper.createVC(user.did, userHederaKey, credentialSubject);
        const item = {
            hash: vc.toCredentialHash(),
            owner: user.did,
            document: vc.toJsonTree(),
            schema: state.data.schema,
            type: state.data.type,
            option: state.data.option
        };

        const owner = await this.users.getUserById(state.data.owner);
        return {
            item, owner
        };
    }

    @CatchErrors()
    async runAction(state: any, user: IAuthUser) {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyBlock>(this);
        console.log(`reassigningBlock: runAction: ${ref.tag}`);
        const { item, owner } = await this.documentReassigning(state, user);
        state.data = item;
        await ref.runNext(owner, state);
        ref.updateBlock(state, user, '');
    }
}
