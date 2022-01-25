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

    async getFromSource(user) {
        const ref = PolicyBlockHelpers.GetBlockRef(this);

        let filters: any = {};
        if (!Array.isArray(ref.options.filters)) {
            throw new BlockActionError('filters option must be an array', ref.blockType, ref.uuid);
        }

        for (let filter of ref.options.filters) {
            const expr = filters[filter.field] || {};

            switch (filter.type) {
                case 'equal':
                    Object.assign(expr, { $eq: filter.value })
                    break;

                case 'not_equal':
                    Object.assign(expr, { $ne: filter.value });
                    break;

                case 'in':
                    Object.assign(expr, { $in: filter.value.split(',') });
                    break;

                case 'not_in':
                    Object.assign(expr, { $nin: filter.value.split(',') });
                    break;

                default:
                    throw new BlockActionError(`Unknown filter type: ${filter.type}`, ref.blockType, ref.uuid);
            }
            filters[filter.field] = expr;
        }

        const dynFilters = {};
        for (let [key, value] of Object.entries(ref.getFilters())) {
            dynFilters[key] = { $eq: value };
        }

        Object.assign(filters, dynFilters);

        console.log(filters);

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
