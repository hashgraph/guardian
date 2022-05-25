import { ExternalData } from '@policy-engine/helpers/decorators';
import { DocumentSignature, DocumentStatus } from '@guardian/interfaces';
import { PolicyValidationResultsContainer } from '@policy-engine/policy-validation-results-container';
import { PolicyComponentsUtils } from '../policy-components-utils';
import { VcDocument } from '@hedera-modules';
import { VcHelper } from '@helpers/vcHelper';
import { getMongoRepository } from 'typeorm';
import { Schema as SchemaCollection } from '@entity/schema';
import { CatchErrors } from '@policy-engine/helpers/decorators/catch-errors';

/**
 * External data block
 */
@ExternalData({
    blockType: 'externalDataBlock',
    commonBlock: false,
})
export class ExternalDataBlock {
    @CatchErrors()
    async receiveData(data: any) {
        const ref = PolicyComponentsUtils.GetBlockRef(this);
        let verify: boolean;
        try {
            const VCHelper = new VcHelper();
            const res = await VCHelper.verifySchema(data.document);
            verify = res.ok;
            if (verify) {
                verify = await VCHelper.verifyVC(data.document);
            }
        } catch (error) {
            ref.error(`Verify VC: ${error.message}`)
            verify = false;
        }

        const signature = verify ? DocumentSignature.VERIFIED : DocumentSignature.INVALID;
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
        ref.runNext(null, {data: doc}).then(
            function () {
            },
            function (error: any) {
                console.error(error);
            }
        );
    }

    public async validate(resultsContainer: PolicyValidationResultsContainer): Promise<void> {
        const ref = PolicyComponentsUtils.GetBlockRef(this);
        try {
            if (ref.options.schema) {
                if (typeof ref.options.schema !== 'string') {
                    resultsContainer.addBlockError(ref.uuid, 'Option "schema" must be a string');
                    return;
                }

                const schema = await getMongoRepository(SchemaCollection).findOne({iri: ref.options.schema});
                if (!schema) {
                    resultsContainer.addBlockError(ref.uuid, `Schema with id "${ref.options.schema}" does not exist`);
                    return;
                }
            }
        } catch (error) {
            resultsContainer.addBlockError(ref.uuid, `Unhandled exception ${error.message}`);
        }
    }
}
