import {User} from '@entity/user';
import {Guardians} from '@helpers/guardians';
import {BlockActionError, BlockInitError} from '@policy-engine/errors';
import {BlockStateUpdate, DependenciesUpdateHandler} from '@policy-engine/helpers/decorators';
import {DataSourceBlock} from '@policy-engine/helpers/decorators/data-source-block';
import {PolicyBlockHelpers} from '@policy-engine/helpers/policy-block-helpers';
import {UserRole} from 'interfaces';
import {getMongoRepository} from 'typeorm';
import {IAuthUser} from '../../auth/auth.interface';
import { Inject } from '@helpers/decorators/inject';
import { Users } from '@helpers/users';
import {PolicyValidationResultsContainer} from '@policy-engine/policy-validation-results-container';

/**
 * Document source block with UI
 */
@DataSourceBlock({
    blockType: 'interfaceDocumentsSource',
    commonBlock: false
})
export class InterfaceDocumentsSource {
    @Inject()
    private users: Users;

    private init() {
        const {options, uuid, blockType} = PolicyBlockHelpers.GetBlockRef(this);

        if (!options.dataType) {
            throw new BlockInitError(`Field "dataType" is required`, blockType, uuid);
        }
        if (!options.onlyOwnDocuments) {
            options.onlyOwnDocuments = true;
        }
        if (!options.onlyAssignDocuments) {
            options.onlyAssignDocuments = false;
        }
        if (!options.uiMetaData) {
            throw new BlockInitError(`Field "uiMetaData" is required`, blockType, uuid);
        }
    }

    @BlockStateUpdate()
    async update(state, user) {
    }

    @DependenciesUpdateHandler()
    async handler(uuid, state, user, tag) {
        console.log(state, state.isActive);
    }

    async getData(user: IAuthUser, uuid: string, queryParams: any): Promise<any> {
        const guardians = new Guardians();
        const ref = PolicyBlockHelpers.GetBlockRef(this);
        const userFull = await this.users.getUser(user.username);

        let filters: any = {};
        if (ref.options.filters) {
            filters = Object.assign(filters, ref.options.filters);
        }
        if (ref.options.onlyOwnDocuments) {
            filters.owner = userFull.did;
        }
        if (ref.options.onlyAssignDocuments) {
            filters.assign = userFull.did;
        }
        let data;

        if (typeof queryParams === 'object') {
            for (let [key, value] of Object.entries(queryParams)) {
                filters[key] = value;
            }
        }

        switch (ref.options.dataType) {
            case 'vc-documents':
                filters.policyId = ref.policyId;
                data = await guardians.getVcDocuments(filters);
                break;

            case 'did-documents':
                data = await guardians.getDidDocuments(filters);
                break;

            case 'vp-documents':
                filters.policyId = ref.policyId;
                data = await guardians.getVpDocuments(filters);
                break;

            case 'root-authorities':
                data = getMongoRepository(User).find({where: {role: {$eq: UserRole.ROOT_AUTHORITY}}})
                break;

            case 'approve':
                filters.policyId = ref.policyId;
                data = await guardians.getApproveDocuments(filters);
                break;

            case 'source':
                data = [];
                break;

            default:
                throw new BlockActionError(`dataType "${ref.options.dataType}" is unknown`, ref.blockType, ref.uuid)
        }

        return Object.assign({data}, ref.options.uiMetaData);
    }

    public async validate(resultsContainer: PolicyValidationResultsContainer): Promise<void> {
        const ref = PolicyBlockHelpers.GetBlockRef(this);

        if (!['vc-documents', 'did-documents', 'vp-documents', 'root-authorities', 'approve', 'source'].find(item => item === ref.options.dataType)) {
            resultsContainer.addBlockError(ref.uuid, 'Option "dataType" must be one of vc-documents, did-documents, vp-documents, root-authorities, approve, source');
        }

        if (Array.isArray(ref.options.uiMetaData.fields)) {
            for (let tag of ref.options.uiMetaData.fields.map(i => i.bindBlock).filter(item => !!item)) {
                if (!resultsContainer.isTagExist(tag)) {
                    resultsContainer.addBlockError(ref.uuid, `Tag "${tag}" does not exist`);
                }
            }
        }
    }
}
