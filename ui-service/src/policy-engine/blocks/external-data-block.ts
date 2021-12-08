import {ExternalData} from '@policy-engine/helpers/decorators';
import {HcsVcDocument, VcSubject} from 'vc-modules';
import {DocumentSignature, DocumentStatus} from 'interfaces';
import {PolicyBlockHelpers} from '@policy-engine/helpers/policy-block-helpers';
import {Inject} from '@helpers/decorators/inject';
import {VcHelper} from '@helpers/vcHelper';

/**
 * External data block
 */
@ExternalData({
    blockType: 'externalDataBlock',
    commonBlock: false,
})
export class ExternalDataBlock {
    @Inject()
    private vcHelper: VcHelper;

    async receiveData(data) {
        let verify: boolean;
        try {
            verify = await this.vcHelper.verifySchema(data.document);
            if(verify) {
                verify = await this.vcHelper.verifyVC(data.document);
            }
        } catch (error) {
            verify = false;
        }
        const signature = verify ? DocumentSignature.VERIFIED : DocumentSignature.INVALID;
        const ref = PolicyBlockHelpers.GetBlockRef(this);
        const vc = HcsVcDocument.fromJsonTree<VcSubject>(data.document, null, VcSubject);
        const doc = {
            hash: vc.toCredentialHash(),
            owner: data.owner,
            document: vc.toJsonTree(),
            status: DocumentStatus.NEW,
            signature:signature,
            policyId: ref.policyId,
            type: ref.options.entityType
        };
        const currentIndex = ref.parent.children.findIndex(el => this === el);
        const nextBlock = ref.parent.children[currentIndex + 1];
        if (nextBlock && nextBlock.runAction) {
            nextBlock.runAction({data: doc}, null).then(
                function () { },
                function (error: any) { console.error(error); }
            );
        }
    }
}