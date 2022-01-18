import {DataSourceAddon} from '@policy-engine/helpers/decorators/data-source-addon';
import {IAuthUser} from '@auth/auth.interface';
import {PolicyBlockHelpers} from '@policy-engine/helpers/policy-block-helpers';

@DataSourceAddon({
    blockType: 'filtersAddon'
})
export class FiltersAddonBlock {
    getData(user: IAuthUser) {
        const ref = PolicyBlockHelpers.GetBlockRef(this);
        return ref.filters;
    }

    setData(user: IAuthUser, data: any) {
        const ref = PolicyBlockHelpers.GetBlockRef(this);
        ref.setFilters(data);
    }
}
