import { PolicyBlockDecoratorOptions } from '@policy-engine/interfaces/block-options';
import { BasicBlock } from './basic-block';
import { BlockActionError } from '@policy-engine/errors';

/**
 * Event block decorator
 * @param options
 */
export function EventBlock(options: Partial<PolicyBlockDecoratorOptions>) {
    return function (constructor: new (...args: any) => any): any {
        const basicClass = BasicBlock(options)(constructor);

        return class extends basicClass {

            public readonly blockClassName = 'EventBlock';

            async getData(...args) {
                const [user] = args;
                if (typeof super.getData === 'function') {
                    const data = await super.getData(...args);
                    const changed = (this as any).updateDataState(user, data);
                    return data;
                }
                return {};
            }

            async setData(...args) {
                if (!this.isActive(args[0])) {
                    throw new BlockActionError('Block not available', this.blockType, this.uuid);
                }
                if (typeof super.getData === 'function') {
                    return await super.setData(...args);
                }
                return {};
            }

            protected async getSources(...args): Promise<any[]> {
                let data = [];
                for (let child of this.children) {
                    if (child.blockClassName === 'SourceAddon') {
                        data = data.concat(await child.getFromSource(...args))
                    }
                }
                return data;
            }
        }
    }
}
