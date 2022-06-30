import { PolicyBlockDecoratorOptions } from '@policy-engine/interfaces/block-options';
import { IPolicyReportItemBlock } from '@policy-engine/policy-engine.interface';
import { DataSourceBlock } from '.';

/**
 * Report block decorator
 * @param options
 */
export function Report(options: Partial<PolicyBlockDecoratorOptions>) {
    // tslint:disable-next-line:only-arrow-functions
    return function (constructor: new (...args: any) => any): any {
        const basicClass = DataSourceBlock(options)(constructor);

        return class extends basicClass {
            /**
             * Block class name
             */
            public readonly blockClassName = 'ReportBlock';

            /**
             * Get items
             * @protected
             */
            protected getItems(): IPolicyReportItemBlock[] {
                const items: IPolicyReportItemBlock[] = [];
                for (const child of this.children) {
                    if (child.blockClassName === 'ReportItemBlock') {
                        items.push(child);
                    }
                }
                return items;
            }
        }
    }
}
