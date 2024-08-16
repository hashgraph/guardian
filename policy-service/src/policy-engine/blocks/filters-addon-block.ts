import { DataSourceAddon } from '../helpers/decorators/data-source-addon.js';
import { BlockActionError } from '../errors/index.js';
import { findOptions } from '../helpers/find-options.js';
import { PolicyComponentsUtils } from '../policy-components-utils.js';
import { IPolicyAddonBlock } from '../policy-engine.interface.js';
import { ChildrenType, ControlType } from '../interfaces/block-about.js';
import { PolicyUser } from '../policy-user.js';
import { ExternalEvent, ExternalEventType } from '../interfaces/external-event.js';

/**
 * Filters addon
 */
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
        defaultEvent: false
    },
    variables: []
})
export class FiltersAddonBlock {

    /**
     * Before init callback
     */
    public async beforeInit(): Promise<void> {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyAddonBlock>(this);
        const documentCacheFields =
            PolicyComponentsUtils.getDocumentCacheFields(ref.policyId);
        if (ref.options?.field?.startsWith('document.')) {
            documentCacheFields.add(ref.options.field.replace('document.', ''));
        }
    }

    private previousState: { [key: string]: any } = {};
    private previousFilters: { [key: string]: any } = {};

    /**
     * Block state
     * @private
     */
    private readonly state: { [key: string]: any } = {
        lastData: null,
        lastValue: null
    };

    /**
     * Get filters
     * @param user
     */
    public async getFilters(user: PolicyUser): Promise<{ [key: string]: string }> {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyAddonBlock>(this);
        const filters = ref.filters[user.id] || {};
        if (ref.options.type === 'dropdown') {
            if (!filters[ref.options.field] && !ref.options.canBeEmpty) {
                const data: any[] = await ref.getSources(user, null);
                const filterValue = findOptions(data[0], ref.options.optionValue);
                if (filterValue) {
                    const blockState = this.state[user.id] || {};
                    blockState.lastValue = filterValue;
                    this.state[user.id] = blockState;
                    filters[ref.options.field] = filterValue;
                } else {
                    filters[ref.options.field] = '';
                }
            }
        }
        return filters;
    }

    /**
     * Get block data
     * @param user
     */
    async getData(user: PolicyUser) {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyAddonBlock>(this);

        const block: any = {
            id: ref.uuid,
            blockType: 'filtersAddon',
            type: ref.options.type,
            uiMetaData: ref.options.uiMetaData,
            canBeEmpty: ref.options.canBeEmpty
        };

        const data: any[] = await ref.getSources(user, null);

        if (ref.options.type === 'dropdown') {
            const blockState = this.state[user.id] || {};
            blockState.lastData = data.map((e) => {
                return {
                    name: findOptions(e, ref.options.optionName),
                    value: findOptions(e, ref.options.optionValue),
                }
            }).filter((value, index, array) => {
                const i = array.findIndex(v => v.value === value.value);
                return i === index;
            });
            block.data = blockState.lastData;
            block.optionName = ref.options.optionName;
            block.optionValue = ref.options.optionValue;
            block.filterValue = blockState.lastValue;
            this.state[user.id] = blockState;
        }

        return block;
    }

    async resetFilters(user: PolicyUser): Promise<void> {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyAddonBlock>(this);
        if (this.previousState[user.id]) {
            this.state[user.id] = this.previousState[user.id];
            delete this.previousState[user.id];
        }
        if (this.previousFilters[user.id]) {
            ref.filters[user.id] = this.previousFilters[user.id];
            delete this.previousFilters[user.id];
        }
    }

    async setFiltersStrict(user: PolicyUser, data: any) {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyAddonBlock>(this);
        this.previousState[user.id] = {...this.state[user.id]};
        const filter: any = {};
        if (!data) {
            throw new BlockActionError(`filter value is unknown`, ref.blockType, ref.uuid)
        }
        if (ref.options.type === 'dropdown') {
            const value = data.filterValue;
            const blockState = this.state[user.id] || {};
            if (!blockState.lastData) {
                await this.getData(user);
            }

            if (value) {
                filter[ref.options.field] = value;
            }

            if (!ref.options.canBeEmpty) {
                throw new BlockActionError(`filter value is unknown`, ref.blockType, ref.uuid)
            }
            blockState.lastValue = value;
            this.state[user.id] = blockState;

        }
        this.previousFilters[user.id] = {...ref.filters[user.id]};
        ref.setFilters(filter, user);
    }

    async setFilterState(user: PolicyUser, data: any): Promise<void> {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyAddonBlock>(this);
        const filter: any = {};
        if (!data) {
            throw new BlockActionError(`filter value is unknown`, ref.blockType, ref.uuid)
        }
        if (ref.options.type === 'dropdown') {
            const value = data.filterValue;
            const blockState = this.state[user.id] || {};
            if (!blockState.lastData) {
                await this.getData(user);
            }
            const selectItem = Array.isArray(blockState.lastData) ? blockState.lastData.find((e: any) => e.value === value) : null;
            if (selectItem) {
                filter[ref.options.field] = selectItem.value;
            } else if (!ref.options.canBeEmpty) {
                throw new BlockActionError(`filter value is unknown`, ref.blockType, ref.uuid)
            }
            blockState.lastValue = value;
            this.state[user.id] = blockState;
        }
        ref.setFilters(filter, user);
    }

    /**
     * Set block data
     * @param user
     * @param data
     */
    async setData(user: PolicyUser, data: any) {
        await this.setFilterState(user, data);
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyAddonBlock>(this);
        PolicyComponentsUtils.ExternalEventFn(new ExternalEvent(ExternalEventType.Set, ref, user, data));
    }
}
