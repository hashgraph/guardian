import { PolicyBlockDecoratorOptions } from '@policy-engine/interfaces/block-options';
import { BasicBlock } from './basic-block';
import { BlockActionError } from '@policy-engine/errors';
import { IPolicyUser } from '@policy-engine/policy-user';

/**
 * Event block decorator
 * @param options
 */
export function EventBlock(options: Partial<PolicyBlockDecoratorOptions>) {
    // tslint:disable-next-line:only-arrow-functions
    return function (constructor: new (...args: any) => any): any {
        const basicClass = BasicBlock(options)(constructor);

        return class extends basicClass {
            /**
             * Block class name
             */
            public readonly blockClassName = 'EventBlock';

            /**
             * Access block methods map
             */
            private readonly _accessMap = new Map<string, boolean>();

            /**
             * Get block data
             * @param args
             */
            async getData(...args) {
                if (typeof super.getData === 'function') {
                    const userDid = args[0]?.did;
                    const result = await super.getData(...args);
                    return result
                        ? {
                              ...result,
                              active: !this._accessMap.get(userDid),
                          }
                        : result;
                }
                return {};
            }

            /**
             * Set block data
             * @param args
             */
            async setData(...args) {
                if (!this.isActive(args[0])) {
                    throw new BlockActionError('Block not available', this.blockType, this.uuid);
                }
                const user = args[0];
                if (this._accessMap.get(user?.did) === true) {
                    throw new BlockActionError('Block is unavailable', this.blockType, this.uuid);
                }
                this._accessMap.set(user?.did, true);
                let result = {};
                if (typeof super.getData === 'function') {
                    try {
                        result = await super.setData(...args);
                    } catch (err) {
                        this._accessMap.delete(user?.did);
                        throw err;
                    }
                }
                this._accessMap.delete(user?.did);
                return result;
            }

            /**
             * Get sources
             * @param user
             * @param globalFilters
             * @protected
             */
            protected async getSources(user: IPolicyUser, globalFilters: any): Promise<any[]> {
                const data = [];
                for (const child of this.children) {
                    if (child.blockClassName === 'SourceAddon') {
                        const childData = await child.getFromSource(user, globalFilters);
                        for (const item of childData) {
                            data.push(item);
                        }
                    }
                }
                return data;
            }
        }
    }
}
