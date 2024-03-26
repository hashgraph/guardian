import { PolicyBlockDecoratorOptions } from '../../interfaces/index.js';
import { BasicBlock } from '../../helpers/decorators/basic-block.js';
import { IPolicyUser, UserCredentials } from '../../policy-user.js';

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
            public async run(scope: any, root: UserCredentials, user: IPolicyUser): Promise<any> {
                if (typeof super.run === 'function') {
                    return super.run(scope, root, user);
                }
                return scope;
            }
        }
    }
}
