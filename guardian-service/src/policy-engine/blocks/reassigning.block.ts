import { Guardians } from '@helpers/guardians';
import { BasicBlock } from '@policy-engine/helpers/decorators';
import { Inject } from '@helpers/decorators/inject';
import { KeyType, Wallet } from '@helpers/wallet';
import { PolicyComponentsUtils } from '../policy-components-utils';
import { IPolicyBlock } from '@policy-engine/policy-engine.interface';
import { IAuthUser } from '@auth/auth.interface';
import { CatchErrors } from '@policy-engine/helpers/decorators/catch-errors';
import { VcHelper } from '@helpers/vcHelper';
import { HcsVcDocument, VcSubject } from 'vc-modules';

@BasicBlock({
    blockType: 'reassigningBlock',
    commonBlock: false
})
export class ReassigningBlock {
    @Inject()
    private wallet: Wallet;

    @Inject()
    private vcHelper: VcHelper;

    async documentReassigning(state, user: IAuthUser): Promise<any> {
        const userHederaKey = await this.wallet.getKey(user.walletToken, KeyType.KEY, user.did);
        const vcDocument = HcsVcDocument.fromJsonTree<VcSubject>(state.data.document, null, VcSubject);
        const credentialSubject = vcDocument.getCredentialSubject()[0].toJsonTree();

        const vc: any= await this.vcHelper.createVC(user.did, userHederaKey, credentialSubject);
        const item = {
            hash: vc.toCredentialHash(),
            owner: user.did,
            document: vc.toJsonTree(),
            schema: state.data.schema,
            type: state.data.type
        };

        return item;
    }

    @CatchErrors()
    async runAction(state: any, user: IAuthUser) {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyBlock>(this);
        console.log(`reassigningBlock: runAction: ${ref.tag}`);
        state.data = await this.documentReassigning(state, user);
        await ref.runNext(user, state);
        ref.updateBlock(state, user, '');
    }
}
