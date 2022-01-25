import {SourceAddon} from '@policy-engine/helpers/decorators';
import {PolicyBlockHelpers} from '@policy-engine/helpers/policy-block-helpers';
import {getMongoRepository} from 'typeorm';
import {User} from '@entity/user';
import {UserRole} from 'interfaces';
import {BlockActionError} from '@policy-engine/errors';
import {Inject} from '@helpers/decorators/inject';
import {Guardians} from '@helpers/guardians';

@SourceAddon({
    blockType: 'documentsSourceAddon'
})
export class DocumentsSourceAddon {
    @Inject()
    private guardians: Guardians;

    // data source
    // action block
    // addon
    async getFromSource(user) {
        const ref = PolicyBlockHelpers.GetBlockRef(this);

        let filters: any = {};
        if (ref.options.filters) {
            filters = Object.assign(filters, ref.options.filters);
        }
        if (ref.options.onlyOwnDocuments) {
            filters.owner = user.did;
        }
        if (ref.options.onlyAssignDocuments) {
            filters.assign = user.did;
        }

        Object.assign(filters, ref.getFilters());

        let data: any[];
        switch (ref.options.dataType) {
            case 'vc-documents':
                filters.policyId = ref.policyId;
                data = await this.guardians.getVcDocuments(filters);
                break;

            case 'did-documents':
                data = await this.guardians.getDidDocuments(filters);
                break;

            case 'vp-documents':
                filters.policyId = ref.policyId;
                data = await this.guardians.getVpDocuments(filters);
                break;

            case 'root-authorities':
                data = await getMongoRepository(User).find({ where: { role: { $eq: UserRole.ROOT_AUTHORITY } } });
                break;

            case 'approve':
                filters.policyId = ref.policyId;
                data = await this.guardians.getApproveDocuments(filters);
                break;

            case 'source':
                data = [];
                break;

            default:
                throw new BlockActionError(`dataType "${ref.options.dataType}" is unknown`, ref.blockType, ref.uuid)
        }

        return data;
    }
}
