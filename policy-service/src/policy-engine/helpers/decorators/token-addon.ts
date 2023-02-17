import { PolicyBlockDecoratorOptions } from '@policy-engine/interfaces';
import { BasicBlock } from '@policy-engine/helpers/decorators/basic-block';
import { IPolicyUser } from '@policy-engine/policy-user';
import { IHederaAccount } from '../utils';

/**
 * Token addon
 * @param options
 * @constructor
 */
export function TokenAddon(options: Partial<PolicyBlockDecoratorOptions>) {
    // tslint:disable-next-line:only-arrow-functions
    return function (constructor: new (...args: any) => any): any {
        const basicClass = BasicBlock(options)(constructor);

        return class extends basicClass {

            /**
             * Block class name
             */
            public readonly blockClassName = 'TokenAddon';

            /**
             * Run block logic
             * @param scope
             */
            public async run(scope: any, root: IHederaAccount, user: IPolicyUser): Promise<any> {
                if (typeof super.run === 'function') {
                    return super.run(scope, root, user);
                }
                return scope;
            }
        }
    }
}
