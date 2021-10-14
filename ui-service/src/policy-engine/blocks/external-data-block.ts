import {ExternalData} from '@policy-engine/helpers/decorators';
import {HcsVcDocument, VcSubject} from 'vc-modules';
import {DocumentSignature, DocumentStatus} from 'interfaces';
import {PolicyBlockHelpers} from '@policy-engine/helpers/policy-block-helpers';

/**
 * External data block
 */
@ExternalData({
    blockType: 'externalDataBlock',
    commonBlock: false,
})
export class ExternalDataBlock {
    async recieveData(data) {
        const ref = PolicyBlockHelpers.GetBlockRef(this);
        const vc = HcsVcDocument.fromJsonTree<VcSubject>(data.document, null, VcSubject);
        const doc = {
            hash: vc.toCredentialHash(),
            owner: data.owner,
            document: vc.toJsonTree(),
            status: DocumentStatus.NEW,
            signature: DocumentSignature.NEW,
            policyId: ref.policyId,
            type: ref.options.entityType
        };
        const currentIndex = ref.parent.children.findIndex(el => this === el);
        const nextBlock = ref.parent.children[currentIndex + 1];
        if (nextBlock && nextBlock.runAction) {
            nextBlock.runAction({data: doc}, null);
        }
    }
}