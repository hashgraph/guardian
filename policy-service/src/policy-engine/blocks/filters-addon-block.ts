import { DataSourceAddon } from '@policy-engine/helpers/decorators/data-source-addon';
import { BlockActionError } from '@policy-engine/errors';
import { findOptions } from '@policy-engine/helpers/find-options';
import { PolicyComponentsUtils } from '@policy-engine/policy-components-utils';
import { IPolicyAddonBlock } from '@policy-engine/policy-engine.interface';
import { ChildrenType, ControlType } from '@policy-engine/interfaces/block-about';
import { IPolicyUser } from '@policy-engine/policy-user';
import { ExternalEvent, ExternalEventType } from '@policy-engine/interfaces/external-event';

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
    public async getFilters(user: IPolicyUser): Promise<{ [key: string]: string }> {
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
    async getData(user: IPolicyUser) {
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
            });
            block.data = blockState.lastData;
            block.optionName = ref.options.optionName;
            block.optionValue = ref.options.optionValue;
            block.filterValue = blockState.lastValue;
            this.state[user.id] = blockState;
        }

        return block;
    }

    /**
     * Set block data
     * @param user
     * @param data
     */
    async setData(user: IPolicyUser, data: any) {
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
            const selectItem = blockState.lastData.find((e: any) => e.value === value);
            if (selectItem) {
                filter[ref.options.field] = selectItem.value;
            } else if (!ref.options.canBeEmpty) {
                throw new BlockActionError(`filter value is unknown`, ref.blockType, ref.uuid)
            }
            blockState.lastValue = value;
            this.state[user.id] = blockState;
        }
        ref.setFilters(filter, user);
        PolicyComponentsUtils.ExternalEventFn(new ExternalEvent(ExternalEventType.Set, ref, user, data));
    }
}
