import { Guardians } from '@helpers/guardians';
import { BlockActionError } from '@policy-engine/errors';
import { BasicBlock } from '@policy-engine/helpers/decorators';
import { PolicyBlockHelpers } from '@policy-engine/helpers/policy-block-helpers';
import { DocumentSignature, DocumentStatus } from 'interfaces';
import { HcsVcDocument, HederaHelper, VcSubject } from 'vc-modules';
import { Inject } from '@helpers/decorators/inject';
import { Users } from '@helpers/users';
import { KeyType, Wallet } from '@helpers/wallet';
import { StateContainer } from '@policy-engine/state-container';

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
        const ref = PolicyBlockHelpers.GetBlockRef(this);
       
        let document = state.data;
        document.policyId = ref.policyId;
        document.tag = ref.tag;

        if (ref.options.forceNew) { 
            document = { ...document };
            document.id = undefined;
            state.data = document;
        }

        let result;
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
        const ref = PolicyBlockHelpers.GetBlockRef(this);

        await this.documentSender(state, user);

        if (ref.options.stopPropagation) {
            return;
        }
        const currentIndex = ref.parent.children.findIndex(el => this === el);
        const nextBlock = ref.parent.children[currentIndex + 1];
        if (nextBlock) {
            if(user) {
                const target = ref.parent;
                const _state = StateContainer.GetBlockState(target.uuid, user);
                _state.index = currentIndex + 1;
                await StateContainer.SetBlockState(target.uuid, _state, user, null); 
            }
            if (nextBlock.runAction) {
                await nextBlock.runAction(state, user);
            } else {

            }
        } else {
            console.log("last block")
            const target = ref.parent;
            const _state = StateContainer.GetBlockState(target.uuid, user);
            _state.index = 0;
            await StateContainer.SetBlockState(target.uuid, _state, user, null);
        }
    }

    convertDocument(document: any, newType: string, ref: any) {
        // need update
        switch (newType) {
            case 'vc-documents': {
                const vc = HcsVcDocument.fromJsonTree<VcSubject>(document.document, null, VcSubject);
                return {
                    hash: vc.toCredentialHash(),
                    owner: document.owner,
                    document: vc.toJsonTree(),
                    status: document.status || DocumentStatus.NEW,
                    signature: document.signature || DocumentSignature.NEW,
                    type: ref.options.entityType,
                    policyId: ref.policyId,
                    tag: ref.tag
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
        console.log("vcTopic", addressBook.vcTopic, vc.toCredentialHash());
        const result = await hederaHelper.DID.createVcTransaction(vc, userKey);
        document.status = result.getOperation();
        console.log("status", document.status, result.getCredentialHash());
        return document;
    }
}