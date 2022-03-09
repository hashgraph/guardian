import { PolicyBlockDecoratorOptions } from '@policy-engine/interfaces';
import { BasicBlock } from '@policy-engine/helpers/decorators/basic-block';
import { IPolicyReportItemBlock } from '@policy-engine/policy-engine.interface';

export function ReportItem(options: Partial<PolicyBlockDecoratorOptions>) {
    return function (constructor: new (...args: any) => any): any {
        const basicClass = BasicBlock(options)(constructor);

        return class extends basicClass {

            public readonly blockClassName = 'ReportItemBlock';

            public async run(fieldsResult: any[], mapVariables: any, userMap: any): Promise<any> {
                if (typeof super.run === 'function') {
                    return super.run(fieldsResult, mapVariables, userMap);
                }
                return fieldsResult;
            }

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
