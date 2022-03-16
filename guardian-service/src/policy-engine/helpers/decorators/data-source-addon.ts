import { PolicyBlockDecoratorOptions } from '@policy-engine/interfaces';
import { BasicBlock } from '@policy-engine/helpers/decorators/basic-block';
import {PolicyComponentsUtils} from '../../policy-components-utils';
import { BlockActionError } from '@policy-engine/errors';

export function DataSourceAddon(options: Partial<PolicyBlockDecoratorOptions>) {
    return function (constructor: new (...args: any) => any): any {
        const basicClass = BasicBlock(options)(constructor);

        return class extends basicClass {

            private filters: { [key: string]: { [key: string]: string } } = {};

            public readonly blockClassName = 'DataSourceAddon';

            protected async getSources(...args): Promise<any[]> {
                let data = [];
                for (let child of this.children) {
                    if (child.blockClassName === 'SourceAddon') {
                        const childData = await child.getFromSource(...args);
                        data = data.concat(childData)
                    }
                }
                return data;
            }

            public getFilters(user): { [key: string]: string } {
                if (typeof super.getFilters === 'function') {
                    return super.getFilters(user);
                }
                return this.filters[user.did];
            }

            protected setFilters(filters, user): void {
                if (typeof super.setFilters === 'function') {
                    super.setFilters(filters, user);
                } else {
                    this.filters[user.did] = filters
                }

            }

            async getData(...args: any[]): Promise<any> {
                if (typeof super.getData === 'function') {
                    return super.getData(...args);
                }
                return {}
            }

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

                PolicyComponentsUtils.BlockUpdateFn(parentBlock.uuid, {}, args[0], this.tag);
                return result;
            }
        }
    }
}
