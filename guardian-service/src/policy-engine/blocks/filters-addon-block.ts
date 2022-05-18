import { DataSourceAddon } from '@policy-engine/helpers/decorators/data-source-addon';
import { IAuthUser } from '@auth/auth.interface';
import { PolicyValidationResultsContainer } from '@policy-engine/policy-validation-results-container';
import { BlockActionError } from '@policy-engine/errors';
import { findOptions } from '@policy-engine/helpers/find-options';
import { PolicyComponentsUtils } from '../policy-components-utils';
import { IPolicyAddonBlock } from '@policy-engine/policy-engine.interface';
import { ChildrenType, ControlType } from '@policy-engine/interfaces/block-about';

@DataSourceAddon({
    blockType: 'filtersAddon',
    about: {
        label: 'Filters Addon',
        title: `Add 'Filters' Addon`,
        post: true,
        get: true,
        children: ChildrenType.Special,
        control: ControlType.Special,
        input: null,
        output: null,
    }
})
export class FiltersAddonBlock {
    private state: { [key: string]: any } = {
        lastData: null,
        lastValue: null
    };

    public getFilters(user: IAuthUser): { [key: string]: string } {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyAddonBlock>(this);
        const filters = ref.filters[user.did] || {};
        if (ref.options.type == 'dropdown') {
            if (!filters[ref.options.field] && !ref.options.canBeEmpty) {
                filters[ref.options.field] = '';
            }
        }
        return filters;
    }

    async getData(user: IAuthUser) {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyAddonBlock>(this);

        let block: any = {
            id: ref.uuid,
            blockType: 'filtersAddon',
            type: ref.options.type,
            uiMetaData: ref.options.uiMetaData,
            canBeEmpty: ref.options.canBeEmpty
        };

        let data: any[] = await ref.getSources(user);

        if (ref.options.type == 'dropdown') {
            const blockState = this.state[user.did] || {};
            blockState.lastData = data.map((e) => {
                return {
                    name: findOptions(e, ref.options.optionName),
                    value: findOptions(e, ref.options.optionValue),
                }
            });
            block.data = blockState.lastData;
            block.optionName = ref.options.optionName;
            block.optionValue = ref.options.optionValue;
            block.filterValue = blockState.lastValue;
            this.state[user.did] = blockState;
        }

        return block;
    }

    async setData(user: IAuthUser, data: any) {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyAddonBlock>(this);
        const filter: any = {};
        if (!data) {
            throw new BlockActionError(`filter value is unknown`, ref.blockType, ref.uuid)
        }
        if (ref.options.type == 'dropdown') {
            const value = data.filterValue;
            const blockState = this.state[user.did] || {};
            if (!blockState.lastData) {
                await this.getData(user);
            }
            const selectItem = blockState.lastData.find((e: any) => e.value == value);
            if (selectItem) {
                filter[ref.options.field] = selectItem.value;
            } else if (!ref.options.canBeEmpty) {
                throw new BlockActionError(`filter value is unknown`, ref.blockType, ref.uuid)
            }
            blockState.lastValue = value;
            this.state[user.did] = blockState;
        }
        ref.setFilters(filter, user);
    }

    public async validate(resultsContainer: PolicyValidationResultsContainer): Promise<void> {
        const ref = PolicyComponentsUtils.GetBlockRef(this);
        try {
            if (!ref.options.type) {
                resultsContainer.addBlockError(ref.uuid, 'Option "type" does not set');
            } else {
                switch (ref.options.type) {
                    case 'dropdown':
                        break;
                    default:
                        resultsContainer.addBlockError(ref.uuid, 'Option "type" must be a "dropdown"');
                }
            }
        } catch (error) {
            resultsContainer.addBlockError(ref.uuid, `Unhandled exception ${error.message}`);
        }
    }
}
