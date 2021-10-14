import {BasicBlock} from '@policy-engine/helpers/decorators/basic-block';
import {PolicyBlockDecoratorOptions} from '@policy-engine/interfaces/block-options';
import {IAuthUser} from '../../../auth/auth.interface';

/**
 * Datasource block block decorator
 * @param options
 */
export function DataSourceBlock(options: Partial<PolicyBlockDecoratorOptions>) {
    return function (constructor: new (...args: any) => any): any {
        const basicClass = BasicBlock(options)(constructor);

        return class extends basicClass {

            public readonly blockClassName = 'DataSourceBlock';

            async getData(user: IAuthUser | null): Promise<any> {
                if (typeof super.getData === 'function') {
                    return super.getData(user);
                }
                return {}
            }
        }
    }
}
