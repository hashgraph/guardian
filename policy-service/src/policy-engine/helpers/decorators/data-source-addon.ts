import { PolicyBlockDecoratorOptions } from '@policy-engine/interfaces';
import { BasicBlock } from '@policy-engine/helpers/decorators/basic-block';
import { PolicyComponentsUtils } from '../../policy-components-utils';
import { BlockActionError } from '@policy-engine/errors';
import { IPolicyUser } from '@policy-engine/policy-user';

/**
 * Data source addon decorator
 * @param options
 * @constructor
 */
export function DataSourceAddon(options: Partial<PolicyBlockDecoratorOptions>) {
    // tslint:disable-next-line:only-arrow-functions
    return function (constructor: new (...args: any) => any): any {
        const basicClass = BasicBlock(options)(constructor);

        return class extends basicClass {
            /**
             * Block class name
             */
            public readonly blockClassName = 'DataSourceAddon';
            /**
             * Block filters
             * @private
             */
            private readonly filters: { [key: string]: { [key: string]: string } } = {};

            /**
             * Get block filters
             * @param user
             */
            public async getFilters(user: IPolicyUser): Promise<{ [key: string]: string }> {
                if (typeof super.getFilters === 'function') {
                    return super.getFilters(user);
                }
                return this.filters[user.id];
            }

            /**
             * Get block data
             * @param args
             */
            async getData(...args: any[]): Promise<any> {
                if (typeof super.getData === 'function') {
                    return super.getData(...args);
                }
                return {}
            }

            /**
             * Set block data
             * @param args
             */
            async setData(...args: any[]): Promise<any> {
                let result = {}
                if (typeof super.setData === 'function') {
                    result = super.setData(...args);
                }

                let parentBlock = this.parent;
                while ((parentBlock as any).blockClassName !== 'DataSourceBlock') {
                    parentBlock = parentBlock.parent
                    if (!parentBlock) {
                        throw new BlockActionError('DataSourceBlock not in block parents', this.blockType, this.uuid)
                    }
                }

                PolicyComponentsUtils.BlockUpdateFn(parentBlock, args[0]);
                return result;
            }

            /**
             * Set filters
             * @param filters
             * @param user
             * @protected
             */
            protected setFilters(filters: any, user: IPolicyUser): void {
                if (typeof super.setFilters === 'function') {
                    super.setFilters(filters, user);
                } else {
                    this.filters[user.id] = filters
                }
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
