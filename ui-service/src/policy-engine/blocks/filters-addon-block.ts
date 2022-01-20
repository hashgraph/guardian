import {DataSourceAddon} from '@policy-engine/helpers/decorators/data-source-addon';
import {IAuthUser} from '@auth/auth.interface';
import {PolicyBlockHelpers} from '@policy-engine/helpers/policy-block-helpers';
import {PolicyValidationResultsContainer} from '@policy-engine/policy-validation-results-container';

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

    getData(user: IAuthUser) {
        const ref = PolicyBlockHelpers.GetBlockRef(this);
        return {
            filters: ref.filters,
            data: []
        };
    }

    setData(user: IAuthUser, data: any) {
        const ref = PolicyBlockHelpers.GetBlockRef(this);
        ref.setFilters(data);
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
