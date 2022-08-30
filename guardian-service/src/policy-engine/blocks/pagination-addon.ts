import { SourceAddon, StateField } from '@policy-engine/helpers/decorators';
import { PolicyComponentsUtils } from '@policy-engine/policy-components-utils';
import { IPolicySourceBlock } from '@policy-engine/policy-engine.interface';
import { ChildrenType, ControlType } from '@policy-engine/interfaces/block-about';
import { IPolicyUser } from '@policy-engine/policy-user';

/**
 * Pagination addon
 */
@SourceAddon({
    blockType: 'paginationAddon',
    about: {
        label: 'Pagination',
        title: `Add 'Pagination' Addon`,
        post: true,
        get: true,
        children: ChildrenType.None,
        control: ControlType.Special,
        input: null,
        output: null,
        defaultEvent: false
    }
})
export class PaginationAddon {

    /**
     * Block state field
     * @private
     */
    @StateField()
    private state;

    constructor() {
        if (!this.state) {
            this.state = {}
        }
    }

    /**
     * Get pagination state
     * @param user
     */
    public async getState(user: IPolicyUser):Promise<any> {
        if (!this.state[user.did]) {
            this.state[user.did] = {
                size: 20,
                itemsPerPage: 10,
                page: 0
            }
        }
        const ref = PolicyComponentsUtils.GetBlockRef(this);
        const totalCount = (await (ref.parent as IPolicySourceBlock).getGlobalSources(user, null)).length;

        if (this.state[user.did].size !== totalCount) {
            this.state[user.did].size = totalCount;
        }

        return this.state[user.did]
    }

    /**
     * Get block data
     * @param user
     */
    public async getData(user: IPolicyUser): Promise<any> {
        return this.getState(user);
    }

    /**
     * Set block data
     * @param user
     * @param data
     */
    public async setData(user: IPolicyUser, data: any): Promise<void> {
        const oldState = this.state;
        oldState[user.did] = data;
        this.state = oldState;

        const ref = PolicyComponentsUtils.GetBlockRef(this);
        PolicyComponentsUtils.BlockUpdateFn(ref.parent.uuid, {}, user, ref.tag);
    }
}
