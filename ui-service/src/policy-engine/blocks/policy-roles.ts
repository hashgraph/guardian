import {EventBlock} from '@policy-engine/helpers/decorators';
import {IAuthUser} from '../../auth/auth.interface';
import {PolicyBlockHelpers} from '@policy-engine/helpers/policy-block-helpers';

@EventBlock({
    blockType: 'policyRolesBlock',
    commonBlock: false,
})
export class PolicyRolesBlock {
    async getData(user: IAuthUser): Promise<any> {
        const ref = PolicyBlockHelpers.GetBlockRef(this);
        return {
            roles: Array.isArray(ref.options.roles) ? ref.options.roles : [],
            uiMetaData: ref.options.uiMetaData
        }
    }

    async setData(user: IAuthUser, document: any): Promise<any> {
        console.log(document);
        return {}
    }
}
