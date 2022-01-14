import { EventBlock } from '@policy-engine/helpers/decorators';
import { IAuthUser } from '../../auth/auth.interface';
import { PolicyBlockHelpers } from '@policy-engine/helpers/policy-block-helpers';
import { Inject } from '@helpers/decorators/inject';
import { Guardians } from '@helpers/guardians';
import { StateContainer } from '@policy-engine/state-container';
import { getMongoRepository, getRepository } from 'typeorm';
import { Policy } from '@entity/policy';
import { Users } from '@helpers/users';
import { KeyType, Wallet } from '@helpers/wallet';
import { User } from '@entity/user';
import { PolicyValidationResultsContainer } from '@policy-engine/policy-validation-results-container';
import { BlockActionError, BlockInitError } from '@policy-engine/errors';

/**
 * Document action clock with UI
 */
@EventBlock({
    blockType: 'interfaceSelector',
    commonBlock: false,
})
export class InterfaceDocumentSelectorBlock {

    @Inject()
    private guardians: Guardians;

    @Inject()
    private users: Users;

    @Inject()
    private wallet: Wallet;

    async getData(user: IAuthUser): Promise<any> {
        const ref = PolicyBlockHelpers.GetBlockRef(this);
        const userFull = await this.users.getUser(user.username);

        const data: any = {
            id: ref.uuid,
            blockType: 'interfaceSelector',
            type: ref.options.type,
            uiMetaData: ref.options.uiMetaData,
            targetBlock: ref.options.targetBlock,
            filters: ref.options.filters || []
        }

        if (ref.options.type == 'dropdown') {
            const guardians = new Guardians();
            let filters: any = {};
            if (ref.options.onlyOwnDocuments) {
                filters.owner = userFull.did;
            }
            if (ref.options.documentSchema) {
                filters.schema = ref.options.documentSchema;
            }
            if (ref.options.documentType) {
                filters.type = ref.options.documentType;
            }
            let documents;
            switch (ref.options.documentSource) {
                case 'vc-documents':
                    filters.policyId = ref.policyId;
                    documents = await guardians.getVcDocuments(filters);
                    break;

                case 'did-documents':
                    documents = await guardians.getDidDocuments(filters);
                    break;

                case 'vp-documents':
                    filters.policyId = ref.policyId;
                    documents = await guardians.getVpDocuments(filters);
                    break;

                case 'approve':
                    filters.policyId = ref.policyId;
                    documents = await guardians.getApproveDocuments(filters);
                    break;

                case 'source':
                    documents = [];
                    break;

                default:
                    throw new BlockActionError(`dataType "${ref.options.documentType}" is unknown`, ref.blockType, ref.uuid)
            }

            data.name = ref.options.name;
            data.options = documents;
        }

        return data;
    }

    public async validate(resultsContainer: PolicyValidationResultsContainer): Promise<void> {
        const ref = PolicyBlockHelpers.GetBlockRef(this);

        if (!ref.options.type) {
            resultsContainer.addBlockError(ref.uuid, 'Option "type" does not set');
        } else {
            switch (ref.options.type) {
                case 'unelected':
                    if (!ref.options.targetBlock) {
                        resultsContainer.addBlockError(ref.uuid, 'Option "targetBlock" does not set');
                    }
                    break;

                case 'dropdown':
                    if (!ref.options.targetBlock) {
                        resultsContainer.addBlockError(ref.uuid, 'Option "targetBlock" does not set');
                    }
                    break;

                default:
                    resultsContainer.addBlockError(ref.uuid, 'Option "type" must be a "unelected|dropdown"');
            }
        }
    }
}
