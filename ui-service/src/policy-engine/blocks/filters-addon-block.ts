import { DataSourceAddon } from '@policy-engine/helpers/decorators/data-source-addon';
import { IAuthUser } from '@auth/auth.interface';
import { PolicyBlockHelpers } from '@policy-engine/helpers/policy-block-helpers';
import { PolicyValidationResultsContainer } from '@policy-engine/policy-validation-results-container';
import { Inject } from '@helpers/decorators/inject';
import { Guardians } from '@helpers/guardians';
import { Users } from '@helpers/users';
import { BlockActionError, BlockInitError } from '@policy-engine/errors';
import { findOptions } from '@policy-engine/helpers/find-options';

@DataSourceAddon({
    blockType: 'filtersAddon'
})
export class FiltersAddonBlock {
    // field
    // type: dropdown
    // dataSource
    // dataSource filters
    // title
    // name/value fields
    // canBeEmpty: bool
    // defaultValue

    private lastData: any;
    private lastValue: any;

    @Inject()
    private users: Users;

    @Inject()
    private guardians: Guardians;

    private init(): void {
        const ref = PolicyBlockHelpers.GetBlockRef(this);
        if (!ref.options.canBeEmpty) {
            ref.filters = {};
            this.lastData = null;
            this.lastValue = null;

            if (ref.options.type == 'dropdown') {
                ref.filters[ref.options.field] = "";
            }

            if (ref.options.type == 'unselected') {
                ref.filters[ref.options.field] = ref.options.filterValue
            }
        } else {
            this.lastData = null;
            this.lastValue = null;
        }

    }

    async getData(user: IAuthUser) {
        const ref = PolicyBlockHelpers.GetBlockRef(this);
        const userFull = await this.users.getUser(user.username);

        let block: any = {
            id: ref.uuid,
            blockType: 'filtersAddon',
            type: ref.options.type,
            uiMetaData: ref.options.uiMetaData,
            canBeEmpty: ref.options.canBeEmpty
        };

        let data: any[];
        if (ref.options.type == 'dropdown') {
            let filters: any = {};
            if (ref.options.onlyOwnDocuments) {
                filters.owner = userFull.did;
            }
            if (ref.options.onlyAssignDocuments) {
                filters.assign = userFull.did;
            }
            if (ref.options.optionSourceSchema) {
                filters.schema = ref.options.optionSourceSchema
            }
            if (ref.options.optionSourceType) {
                filters.type = ref.options.optionSourceType;
            }

            switch (ref.options.optionSource) {
                case 'vc-documents':
                    filters.policyId = ref.policyId;
                    console.log(filters);
                    data = await this.guardians.getVcDocuments(filters);
                    break;

                case 'did-documents':
                    data = await this.guardians.getDidDocuments(filters);
                    break;

                case 'vp-documents':
                    filters.policyId = ref.policyId;
                    data = await this.guardians.getVpDocuments(filters);
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
            data = data || [];
            this.lastData = data.map((e) => {
                return {
                    name: findOptions(e, ref.options.optionName),
                    value: findOptions(e, ref.options.optionValue),
                }
            });
            block.data = this.lastData;
            block.optionName = ref.options.optionName;
            block.optionValue = ref.options.optionValue;
            block.filterValue = this.lastValue;
        }

        if (ref.options.type == 'unselected') {
            block.filterValue = ref.options.filterValue;
        }

        return block;
    }

    setData(user: IAuthUser, data: any) {
        const ref = PolicyBlockHelpers.GetBlockRef(this);
        const filter: any = {};
        if (!data) {
            throw new BlockActionError(`filter value "${ref.options.dataType}" is unknown`, ref.blockType, ref.uuid)
        }
        if (ref.options.type == 'dropdown') {
            const value = data.filterValue;
            if (!this.lastData) {
                throw new BlockActionError(`data "${ref.options.dataType}" is unknown`, ref.blockType, ref.uuid)
            }
            const selectItem = this.lastData.find((e:any) => e.value == value);
            if (selectItem) {
                filter[ref.options.field] = selectItem.value;
            } else if (!ref.options.canBeEmpty) {
                throw new BlockActionError(`filter value "${ref.options.dataType}" is unknown`, ref.blockType, ref.uuid)
            }
            this.lastValue = value;
        }
        ref.setFilters(filter);
    }

    public async validate(resultsContainer: PolicyValidationResultsContainer): Promise<void> {
        const ref = PolicyBlockHelpers.GetBlockRef(this);

        if (!ref.options.type) {
            resultsContainer.addBlockError(ref.uuid, 'Option "type" does not set');
        } else {
            switch (ref.options.type) {
                case 'unselected':
                    break;

                case 'dropdown':
                    break;

                default:
                    resultsContainer.addBlockError(ref.uuid, 'Option "type" must be a "unselected|dropdown"');
            }
        }
    }
}
