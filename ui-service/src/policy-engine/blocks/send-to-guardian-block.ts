import { Guardians } from '@helpers/guardians';
import { BlockActionError } from '@policy-engine/errors';
import { BasicBlock } from '@policy-engine/helpers/decorators';
import { DocumentSignature, DocumentStatus } from 'interfaces';
import { HcsVcDocument, HederaHelper, VcSubject } from 'vc-modules';
import { Inject } from '@helpers/decorators/inject';
import { Users } from '@helpers/users';
import { KeyType, Wallet } from '@helpers/wallet';
import { PolicyComponentsStuff } from '@policy-engine/policy-components-stuff';
import {PolicyValidationResultsContainer} from '@policy-engine/policy-validation-results-container';
import {IPolicyBlock} from '@policy-engine/policy-engine.interface';

@BasicBlock({
    blockType: 'sendToGuardian',
    commonBlock: true
})
export class SendToGuardianBlock {
    @Inject()
    private guardians: Guardians;

    @Inject()
    private wallet: Wallet;

    @Inject()
    private users: Users;

    async documentSender(state, user): Promise<any> {
        const ref = PolicyComponentsStuff.GetBlockRef(this);

        let document = state.data;
        document.policyId = ref.policyId;
        document.tag = ref.tag;

        if (ref.options.forceNew) {
            document = { ...document };
            document.id = undefined;
            state.data = document;
        }

        let result:any;
        switch (ref.options.dataType) {
            case 'vc-documents': {
                const doc = this.convertDocument(document, 'vc-documents', ref)
                result = await this.guardians.setVcDocument(doc);
                break;
            }
            case 'did-documents': {
                result = await this.guardians.setDidDocument(document);
                break;
            }
            case 'approve': {
                const doc = this.convertDocument(document, 'approve', ref);
                result = await this.guardians.setApproveDocuments(doc);
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

    async runAction(state, user) {
        console.log("send-to-guardian-block runAction");
        const ref = PolicyComponentsStuff.GetBlockRef<IPolicyBlock>(this);
        await this.documentSender(state, user);
        await ref.runNext(user, state);
        ref.updateBlock(state, user, '');
    }

    convertDocument(document: any, newType: string, ref: any) {
        // need update
        switch (newType) {
            case 'vc-documents': {
                const vc = HcsVcDocument.fromJsonTree<VcSubject>(document.document, null, VcSubject);
                return {
                    hash: vc.toCredentialHash(),
                    owner: document.owner,
                    assign: document.assign,
                    document: vc.toJsonTree(),
                    hederaStatus: document.status || DocumentStatus.NEW,
                    signature: document.signature || DocumentSignature.NEW,
                    type: ref.options.entityType,
                    policyId: ref.policyId,
                    tag: ref.tag,
                    option: document.option,
                    schema: document.schema
                };
            }
            case 'approve': {
                return document;
            }
            default:
                return document;
        }
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
        const ref = PolicyComponentsStuff.GetBlockRef(this);

        if (!['vc-documents', 'did-documents', 'approve', 'hedera'].find(item => item === ref.options.dataType)) {
            resultsContainer.addBlockError(ref.uuid, 'Option "dataType" must be one of vc-documents, did-documents, approve, hedera');
        }
    }
}
