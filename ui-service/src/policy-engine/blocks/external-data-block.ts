import { ExternalData } from '@policy-engine/helpers/decorators';
import { HcsVcDocument, VcSubject } from 'vc-modules';
import { DocumentSignature, DocumentStatus, SchemaStatus } from 'interfaces';
import { PolicyBlockHelpers } from '@policy-engine/helpers/policy-block-helpers';
import { Inject } from '@helpers/decorators/inject';
import { VcHelper } from '@helpers/vcHelper';
import { PolicyValidationResultsContainer } from '@policy-engine/policy-validation-results-container';
import { Guardians } from '@helpers/guardians';
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

    @Inject()
    private guardians: Guardians;

    async receiveData(data) {
        let verify: boolean;
        try {
            const res = await this.vcHelper.verifySchema(data.document);
            verify = res.ok;
            if (verify) {
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
            signature: signature,
            policyId: ref.policyId,
            type: ref.options.entityType
        };
        ref.runNext(null, { data: doc }).then(
            function () { },
            function (error: any) { console.error(error); }
        );
    }

    public async validate(resultsContainer: PolicyValidationResultsContainer): Promise<void> {
        const ref = PolicyBlockHelpers.GetBlockRef(this);
        if (ref.options.schema) {
            if (typeof ref.options.schema !== 'string') {
                resultsContainer.addBlockError(ref.uuid, 'Option "schema" must be a string');
                return;
            }
            const schemas = await this.guardians.getSchemes() || [];
            const schema = schemas.find(s => s.iri === ref.options.schema)
            if (!schema) {
                resultsContainer.addBlockError(ref.uuid, `Schema with id "${ref.options.schema}" does not exist`);
                return;
            }
            if (schema.status != SchemaStatus.PUBLISHED) {
                resultsContainer.addBlockError(ref.uuid, `Schema with id "${ref.options.schema}" does not published`);
                return;
            }
        }
    }
}