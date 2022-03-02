import { PolicyBlockDecoratorOptions } from '@policy-engine/interfaces/block-options';
import { IPolicyReportItemBlock } from '@policy-engine/policy-engine.interface';
import { DataSourceBlock } from '.';

/**
 * Report block decorator
 * @param options
 */
export function Report(options: Partial<PolicyBlockDecoratorOptions>) {
    return function (constructor: new (...args: any) => any): any {
        const basicClass = DataSourceBlock(options)(constructor);

        return class extends basicClass {

            public readonly blockClassName = 'ReportBlock';

            protected getItems(): IPolicyReportItemBlock[] {
                const items: IPolicyReportItemBlock[] = [];
                for (let child of this.children) {
                    if (child.blockClassName === 'ReportItemBlock') {
                        items.push(child);
                    }
                }
                return items;
            }
        }
    }
}
