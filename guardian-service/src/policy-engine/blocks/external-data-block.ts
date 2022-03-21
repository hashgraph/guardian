import { ExternalData } from '@policy-engine/helpers/decorators';
import { DocumentSignature, DocumentStatus, SchemaStatus } from 'interfaces';
import { Inject } from '@helpers/decorators/inject';
import { PolicyValidationResultsContainer } from '@policy-engine/policy-validation-results-container';
import { Guardians } from '@helpers/guardians';
import { PolicyComponentsUtils } from '../policy-components-utils';
import { VcDocument } from 'hedera-modules';
import { VcHelper } from '@helpers/vcHelper';
/**
 * External data block
 */
@ExternalData({
    blockType: 'externalDataBlock',
    commonBlock: false,
})
export class ExternalDataBlock {
    @Inject()
    private guardians: Guardians;

    async receiveData(data: any) {
        let verify: boolean;
        try {
            const VCHelper = new VcHelper();
            const res = await VCHelper.verifySchema(data.document);
            verify = res.ok;
            if (verify) {
                verify = await VCHelper.verifyVC(data.document);
            }
        } catch (error) {
            verify = false;
        }
        const signature = verify ? DocumentSignature.VERIFIED : DocumentSignature.INVALID;
        const ref = PolicyComponentsUtils.GetBlockRef(this);
        const vc = VcDocument.fromJsonTree(data.document);
        const doc = {
            hash: vc.toCredentialHash(),
            owner: data.owner,
            document: vc.toJsonTree(),
            status: DocumentStatus.NEW,
            signature: signature,
            policyId: ref.policyId,
            type: ref.options.entityType,
            schema: ref.options.schema
        };
        ref.runNext(null, { data: doc }).then(
            function () { },
            function (error: any) { console.error(error); }
        );
    }

    public async validate(resultsContainer: PolicyValidationResultsContainer): Promise<void> {
        const ref = PolicyComponentsUtils.GetBlockRef(this);
        if (ref.options.schema) {
            if (typeof ref.options.schema !== 'string') {
                resultsContainer.addBlockError(ref.uuid, 'Option "schema" must be a string');
                return;
            }

            const schema = await this.guardians.getSchemaByIRI(ref.options.schema);
            if (!schema) {
                resultsContainer.addBlockError(ref.uuid, `Schema with id "${ref.options.schema}" does not exist`);
                return;
            }
        }
    }
}
