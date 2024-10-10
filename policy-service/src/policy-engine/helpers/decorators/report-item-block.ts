import { PolicyBlockDecoratorOptions } from '../../interfaces/index.js';
import { BasicBlock } from '../../helpers/decorators/basic-block.js';
import { IPolicyReportItemBlock } from '../../policy-engine.interface.js';

/**
 * Report Irem decorator
 * @param options
 * @constructor
 */
export function ReportItem(options: Partial<PolicyBlockDecoratorOptions>) {
    // tslint:disable-next-line:only-arrow-functions
    return function (constructor: new (...args: any) => any): any {
        const basicClass = BasicBlock(options)(constructor);

        return class extends basicClass {
            /**
             * Block class name
             */
            public readonly blockClassName = 'ReportItemBlock';

            /**
             * Block run action
             * @param fieldsResult
             * @param mapVariables
             * @param userMap
             */
            public async run(fieldsResult: any[], mapVariables: any, userMap: any): Promise<any> {
                if (typeof super.run === 'function') {
                    return super.run(fieldsResult, mapVariables, userMap);
                }
                return fieldsResult;
            }

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
