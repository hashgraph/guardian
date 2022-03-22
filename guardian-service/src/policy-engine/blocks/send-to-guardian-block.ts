import { Guardians } from '@helpers/guardians';
import { BlockActionError } from '@policy-engine/errors';
import { BasicBlock } from '@policy-engine/helpers/decorators';
import { DocumentSignature, DocumentStatus } from 'interfaces';
import { HcsVcDocument, HederaHelper, VcSubject } from 'vc-modules';
import { Inject } from '@helpers/decorators/inject';
import { Users } from '@helpers/users';
import { KeyType, Wallet } from '@helpers/wallet';
import { PolicyComponentsUtils } from '../policy-components-utils';
import { PolicyValidationResultsContainer } from '@policy-engine/policy-validation-results-container';
import { IPolicyBlock } from '@policy-engine/policy-engine.interface';
import { IAuthUser } from '@auth/auth.interface';
import { CatchErrors } from '@policy-engine/helpers/decorators/catch-errors';

@BasicBlock({
    blockType: 'sendToGuardianBlock',
    commonBlock: true
})
export class SendToGuardianBlock {
    @Inject()
    private guardians: Guardians;

    @Inject()
    private wallet: Wallet;

    @Inject()
    private users: Users;

    async documentSender(state, user: IAuthUser): Promise<any> {
        const ref = PolicyComponentsUtils.GetBlockRef(this);

        let document = state.data;
        document.policyId = ref.policyId;
        document.tag = ref.tag;
        document.type = ref.options.entityType;

        if (ref.options.forceNew) {
            document = { ...document };
            document.id = undefined;
            state.data = document;
        }
        if (ref.options.options) {
            document.option = document.option || {};
            for (let index = 0; index < ref.options.options.length; index++) {
                const option = ref.options.options[index];
                document.option[option.name] = option.value;
            }
        }

        let result: any;
        switch (ref.options.dataType) {
            case 'vc-documents': {
                const vc = HcsVcDocument.fromJsonTree<VcSubject>(document.document, null, VcSubject);
                const doc = {
                    hash: vc.toCredentialHash(),
                    owner: document.owner,
                    assign: document.assign,
                    option: document.option,
                    schema: document.schema,
                    hederaStatus: document.status || DocumentStatus.NEW,
                    signature: document.signature || DocumentSignature.NEW,
                    type: ref.options.entityType,
                    policyId: ref.policyId,
                    tag: ref.tag,
                    document: vc.toJsonTree()
                };
                result = await this.guardians.setVcDocument(doc);
                break;
            }
            case 'did-documents': {
                result = await this.guardians.setDidDocument(document);
                break;
            }
            case 'approve': {
                result = await this.guardians.setApproveDocuments(document);
                break;
            }
            case 'hedera': {
                result = await this.sendToHedera(document, ref);
                break;
            }
            default:
                throw new BlockActionError(`dataType "${ref.options.dataType}" is unknown`, ref.blockType, ref.uuid)
        }

        return result;
    }

    @CatchErrors()
    async runAction(state: any, user: IAuthUser) {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyBlock>(this);
        console.log(`sendToGuardianBlock: runAction: ${ref.tag}`);
        await this.documentSender(state, user);
        await ref.runNext(user, state);
        ref.updateBlock(state, user, '');
    }

    async sendToHedera(document: any, ref: any) {
        const userFull = await this.users.getUserById(document.owner);
        const userID = userFull.hederaAccountId;
        const userDID = userFull.did;
        const userKey = await this.wallet.getKey(userFull.walletToken, KeyType.KEY, userDID);
        const addressBook = await this.guardians.getAddressBook(ref.policyOwner);
        const hederaHelper = HederaHelper
            .setOperator(userID, userKey)
            .setAddressBook(addressBook.addressBook, addressBook.didTopic, addressBook.vcTopic);
        const vc = HcsVcDocument.fromJsonTree<VcSubject>(document.document, null, VcSubject);
        const result = await hederaHelper.DID.createVcTransaction(vc, userKey);
        document.hederaStatus = result.getOperation();
        return document;
    }

    public async validate(resultsContainer: PolicyValidationResultsContainer): Promise<void> {
        const ref = PolicyComponentsUtils.GetBlockRef(this);

        if (!['vc-documents', 'did-documents', 'approve', 'hedera'].find(item => item === ref.options.dataType)) {
            resultsContainer.addBlockError(ref.uuid, 'Option "dataType" must be one of vc-documents, did-documents, approve, hedera');
        }
    }
}
