import { DataSourceAddon } from '@policy-engine/helpers/decorators/data-source-addon';
import { IAuthUser } from '@auth/auth.interface';
import { PolicyValidationResultsContainer } from '@policy-engine/policy-validation-results-container';
import { Inject } from '@helpers/decorators/inject';
import { Guardians } from '@helpers/guardians';
import { Users } from '@helpers/users';
import { BlockActionError, BlockInitError } from '@policy-engine/errors';
import { findOptions } from '@policy-engine/helpers/find-options';
import {PolicyComponentsStuff} from '@policy-engine/policy-components-stuff';
import {IPolicyAddonBlock} from '@policy-engine/policy-engine.interface';

@DataSourceAddon({
    blockType: 'filtersAddon'
})
export class FiltersAddonBlock {
    private lastData: any;
    private lastValue: any;

    @Inject()
    private users: Users;

    private init(): void {
        const ref = PolicyComponentsStuff.GetBlockRef<IPolicyAddonBlock>(this);
        if (!ref.options.canBeEmpty) {
            ref.filters = {};
            this.lastData = null;
            this.lastValue = null;

            if (ref.options.type == 'dropdown') {
                ref.filters[ref.options.field] = "";
            }
        } else {
            this.lastData = null;
            this.lastValue = null;
        }
    }

    async getData(user: IAuthUser) {
        const ref = PolicyComponentsStuff.GetBlockRef<IPolicyAddonBlock>(this);
        const userFull = await this.users.getUser(user.username);

        let block: any = {
            id: ref.uuid,
            blockType: 'filtersAddon',
            type: ref.options.type,
            uiMetaData: ref.options.uiMetaData,
            canBeEmpty: ref.options.canBeEmpty
        };

        let data: any[] = await ref.getSources(userFull);

        if (ref.options.type == 'dropdown') {
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

        return block;
    }

    async setData(user: IAuthUser, data: any) {
        const ref = PolicyComponentsStuff.GetBlockRef<IPolicyAddonBlock>(this);
        const filter: any = {};
        if (!data) {
            throw new BlockActionError(`filter value is unknown`, ref.blockType, ref.uuid)
        }
        if (ref.options.type == 'dropdown') {
            const value = data.filterValue;
            if (!this.lastData) {
                await this.getData(user);
            }
            const selectItem = this.lastData.find((e:any) => e.value == value);
            if (selectItem) {
                filter[ref.options.field] = selectItem.value;
            } else if (!ref.options.canBeEmpty) {
                throw new BlockActionError(`filter value is unknown`, ref.blockType, ref.uuid)
            }
            this.lastValue = value;
        }
        ref.setFilters(filter);
    }

    public async validate(resultsContainer: PolicyValidationResultsContainer): Promise<void> {
        const ref = PolicyComponentsStuff.GetBlockRef(this);

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
    }
}
