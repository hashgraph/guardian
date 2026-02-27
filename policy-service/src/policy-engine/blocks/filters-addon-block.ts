import { LocationType } from '@guardian/interfaces';
import { BlockActionError } from '../errors/index.js';
import { DataSourceAddon } from '../helpers/decorators/data-source-addon.js';
import { findOptions } from '../helpers/find-options.js';
import { PolicyUtils, QueryType } from '../helpers/utils.js';
import { ChildrenType, ControlType } from '../interfaces/block-about.js';
import { ExternalEvent, ExternalEventType } from '../interfaces/external-event.js';
import { PolicyComponentsUtils } from '../policy-components-utils.js';
import { IPolicyAddonBlock, IPolicyGetData } from '../policy-engine.interface.js';
import { PolicyUser } from '../policy-user.js';

/**
 * Filters addon
 */
@DataSourceAddon({
    blockType: 'filtersAddon',
    actionType: LocationType.LOCAL,
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
    private readonly previousState: { [key: string]: any } = {};
    private readonly previousFilters: { [key: string]: any } = {};

    /**
     * Block state
     * @private
     */
    private readonly state: { [key: string]: any } = {
        lastData: null,
        lastValue: null
    };

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

    private async addQuery(filter: any, value: any, user?: PolicyUser) {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyAddonBlock>(this);
        const options = await ref.getOptions(user);
        const query = PolicyUtils.parseQuery(options.queryType || QueryType.eq, value);
        if (query && query.expression) {
            filter[options.field] = query.expression;
        } else {
            throw new BlockActionError(`Unknown filter type: ${filter.type}`, ref.blockType, ref.uuid);
        }
    }

    private async checkValues(blockState: any, value: any, user: PolicyUser): Promise<boolean> {
        if (Array.isArray(blockState.lastData)) {
            const ref = PolicyComponentsUtils.GetBlockRef<IPolicyAddonBlock>(this);
            const options = await ref.getOptions(user);
            const query = PolicyUtils.parseQuery(options.queryType || QueryType.eq, value);
            const itemValues = query.value;
            if (Array.isArray(itemValues)) {
                for (const itemValue of itemValues) {
                    // tslint:disable-next-line:triple-equals
                    const v = blockState.lastData.find((e: any) => e.value == itemValue)
                    if (!v) {
                        return false;
                    }
                }
                return true;
            } else {
                for (const e of blockState.lastData) {
                    // tslint:disable-next-line:triple-equals
                    if (e.value == itemValues) {
                        return true;
                    }
                }
                return false;
            }
        } else {
            return false;
        }
    }

    /**
     * Get filters
     * @param user
     */
    public async getFilters(user: PolicyUser): Promise<{ [key: string]: string }> {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyAddonBlock>(this);
        const filters = ref.filters[user.id] || {};
        const options = await ref.getOptions(user);

        if (!filters[options.field] && !options.canBeEmpty) {

            let filterValue: any;
            if (options.type === 'dropdown') {
                const data: any[] = await ref.getSources(user, null);
                filterValue = findOptions(data[0], options.optionValue);
            }

            if (options.type === 'datepicker') {
                filterValue = '';
            }

            if (options.type === 'input') {
                filterValue = '';
            }

            if (filterValue) {
                const blockState = this.state[user.id] || {};
                blockState.lastValue = filterValue;
                this.state[user.id] = blockState;
            } else {
                filterValue = '';
            }
            if (options.queryType === 'user_defined') {
                filterValue = 'eq:' + filterValue;
            }

            await this.addQuery(filters, filterValue, user);
        }
        return filters;
    }

    /**
     * Get block data
     * @param user
     */
    async getData(user: PolicyUser): Promise<IPolicyGetData> {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyAddonBlock>(this);
        const options = await ref.getOptions(user);

        const block: IPolicyGetData = {
            id: ref.uuid,
            blockType: 'filtersAddon',
            actionType: ref.actionType,
            readonly: (
                ref.actionType === LocationType.REMOTE &&
                user.location === LocationType.REMOTE
            ),
            type: options.type,
            uiMetaData: options.uiMetaData,
            canBeEmpty: options.canBeEmpty,
            queryType: options.queryType
        };

        const data: any[] = await ref.getSources(user, null);

        if (options.type === 'dropdown') {
            const blockState = this.state[user.id] || {};
            blockState.lastData = data.map((e) => {
                return {
                    name: findOptions(e, options.optionName),
                    value: findOptions(e, options.optionValue),
                }
            }).filter((value, index, array) => {
                const i = array.findIndex(v => v.value === value.value);
                return i === index;
            });
            block.data = blockState.lastData;
            block.optionName = options.optionName;
            block.optionValue = options.optionValue;
            block.filterValue = blockState.lastValue;
            this.state[user.id] = blockState;
        }

        if (options.type === 'datepicker' || options.type === 'input') {
            const blockState = this.state[user.id] || {};
            block.filterValue = blockState.lastValue;
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
        const options = await ref.getOptions(user);

        this.previousState[user.id] = { ...this.state[user.id] };
        const filter: any = {};
        if (!data) {
            throw new BlockActionError(`filter value is unknown`, ref.blockType, ref.uuid)
        }

        const value = data.filterValue;
        const blockState = this.state[user.id] || {};
        if (options.type === 'dropdown') {
            if (!blockState.lastData) {
                await this.getData(user);
            }
            if (value) {
                this.addQuery(filter, value);
            } else if (!options.canBeEmpty) {
                throw new BlockActionError(`filter value is unknown`, ref.blockType, ref.uuid)
            }
        }
        if (options.type === 'datepicker') {
            if (value) {
                this.addQuery(filter, value);
            } else if (!options.canBeEmpty) {
                throw new BlockActionError(`filter value is unknown`, ref.blockType, ref.uuid)
            }
        }
        if (options.type === 'input') {
            if (value) {
                this.addQuery(filter, value);
            } else if (!options.canBeEmpty) {
                throw new BlockActionError(`filter value is unknown`, ref.blockType, ref.uuid)
            }
        }
        blockState.lastValue = value;
        this.state[user.id] = blockState;
        this.previousFilters[user.id] = { ...ref.filters[user.id] };
        ref.setFilters(filter, user);
    }

    async setFilterState(user: PolicyUser, data: any): Promise<void> {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyAddonBlock>(this);
        const options = await ref.getOptions(user);

        this.previousState[user.id] = { ...this.state[user.id] };
        const filter: any = {};
        if (!data) {
            throw new BlockActionError(`filter value is unknown`, ref.blockType, ref.uuid)
        }

        const value = data.filterValue;
        const blockState = this.state[user.id] || {};
        if (options.type === 'dropdown') {
            if (!blockState.lastData) {
                await this.getData(user);
            }
            if (await this.checkValues(blockState, value, user)) {
                this.addQuery(filter, value);
            } else if (!options.canBeEmpty) {
                throw new BlockActionError(`filter value is unknown`, ref.blockType, ref.uuid)
            }
        }
        if (options.type === 'datepicker') {
            if (value) {
                this.addQuery(filter, value);
            } else if (!options.canBeEmpty) {
                throw new BlockActionError(`filter value is unknown`, ref.blockType, ref.uuid)
            }
        }
        if (options.type === 'input') {
            if (value) {
                this.addQuery(filter, value);
            } else if (!options.canBeEmpty) {
                throw new BlockActionError(`filter value is unknown`, ref.blockType, ref.uuid)
            }
        }
        blockState.lastValue = value;
        this.state[user.id] = blockState;

        this.previousFilters[user.id] = { ...ref.filters[user.id] };
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
