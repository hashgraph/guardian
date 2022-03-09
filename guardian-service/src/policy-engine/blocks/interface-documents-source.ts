import { Guardians } from '@helpers/guardians';
import { BlockStateUpdate } from '@policy-engine/helpers/decorators';
import { DataSourceBlock } from '@policy-engine/helpers/decorators/data-source-block';
import { IAuthUser } from '../../auth/auth.interface';
import { Inject } from '@helpers/decorators/inject';
import { Users } from '@helpers/users';
import { PolicyValidationResultsContainer } from '@policy-engine/policy-validation-results-container';
import {PolicyComponentsUtils} from '../policy-components-utils';
import {IPolicySourceBlock} from '@policy-engine/policy-engine.interface';

/**
 * Document source block with UI
 */
@DataSourceBlock({
    blockType: 'interfaceDocumentsSourceBlock',
    commonBlock: false
})
export class InterfaceDocumentsSource {
    @Inject()
    private users: Users;

    @BlockStateUpdate()
    async update(state, user) {
    }

    async getData(user: IAuthUser, uuid: string, queryParams: any): Promise<any> {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicySourceBlock>(this);
        const userFull = await this.users.getUser(user.username);

        const blocks = ref.getFiltersAddons().map(addon => {
            return {
                id: addon.uuid,
                uiMetaData: addon.options.uiMetaData,
                blockType: addon.blockType
            }
        });

        return Object.assign({
            data: await ref.getSources(user),
            blocks
        }, ref.options.uiMetaData);
    }

    public async validate(resultsContainer: PolicyValidationResultsContainer): Promise<void> {
        const ref = PolicyComponentsUtils.GetBlockRef(this);
        if (Array.isArray(ref.options.uiMetaData.fields)) {
            for (let tag of ref.options.uiMetaData.fields.map(i => i.bindBlock).filter(item => !!item)) {
                if (!resultsContainer.isTagExist(tag)) {
                    resultsContainer.addBlockError(ref.uuid, `Tag "${tag}" does not exist`);
                }
            }
        }
    }
}
