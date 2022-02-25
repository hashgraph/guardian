import { Guardians } from '@helpers/guardians';
import { BlockStateUpdate } from '@policy-engine/helpers/decorators';
import { DataSourceBlock } from '@policy-engine/helpers/decorators/data-source-block';
import { IAuthUser } from '../../auth/auth.interface';
import { Inject } from '@helpers/decorators/inject';
import { Users } from '@helpers/users';
import { PolicyValidationResultsContainer } from '@policy-engine/policy-validation-results-container';
import {PolicyComponentsStuff} from '@policy-engine/policy-components-stuff';
import {IPolicyContainerBlock, IPolicySourceBlock} from '@policy-engine/policy-engine.interface';

/**
 * Document source block with UI
 */
@DataSourceBlock({
    blockType: 'interfaceDocumentsSource',
    commonBlock: false
})
export class InterfaceDocumentsSource {
    @Inject()
    private users: Users;

    @BlockStateUpdate()
    async update(state, user) {
    }

    async getData(user: IAuthUser, uuid: string, queryParams: any): Promise<any> {
        const ref = PolicyComponentsStuff.GetBlockRef<IPolicySourceBlock>(this);
        const userFull = await this.users.getUser(user.username);

        const blocks = ref.getFiltersAddons().map(addon => {
            return {
                id: addon.uuid,
                uiMetaData: addon.options.uiMetaData,
                blockType: addon.blockType
            }
        });

        return Object.assign({
            data: await ref.getSources(userFull),
            blocks
        }, ref.options.uiMetaData);
    }

    public async validate(resultsContainer: PolicyValidationResultsContainer): Promise<void> {
        const ref = PolicyComponentsStuff.GetBlockRef(this);
        if (Array.isArray(ref.options.uiMetaData.fields)) {
            for (let tag of ref.options.uiMetaData.fields.map(i => i.bindBlock).filter(item => !!item)) {
                if (!resultsContainer.isTagExist(tag)) {
                    resultsContainer.addBlockError(ref.uuid, `Tag "${tag}" does not exist`);
                }
            }
        }
    }
}
