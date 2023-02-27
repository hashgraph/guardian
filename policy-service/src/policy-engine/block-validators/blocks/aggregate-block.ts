import { BlockValidator, IBlockProp } from '@policy-engine/block-validators';

/**
 * Aggregate block
 */
export class AggregateBlock {
    public static readonly blockType: string = 'aggregateDocumentBlock';

    /**
     * Validate block options
     * @param validator
     * @param config
     */
    public static async validate(validator: BlockValidator, ref: IBlockProp): Promise<void> {
        try {
            if (ref.options.aggregateType === 'cumulative') {
                const variables: any = {};
                if (ref.options.expressions) {
                    for (const expression of ref.options.expressions) {
                        variables[expression.name] = true;
                    }
                }
                if (!ref.options.condition) {
                    validator.addError('Option "condition" does not set');
                } else if (typeof ref.options.condition !== 'string') {
                    validator.addError('Option "condition" must be a string');
                } else {
                    const vars = validator.parsFormulaVariables(ref.options.condition);
                    for (const varName of vars) {
                        if (!variables[varName]) {
                            validator.addError(`Variable '${varName}' not defined`);
                        }
                    }
                }
            } else if(ref.options.aggregateType !== 'period') {
                validator.addError('Option "aggregateType" must be one of period, cumulative');
            }
            if (
                ref.options.groupByFields &&
                ref.options.groupByFields.length > 0
            ) {
                if (ref.options.groupByFields.find((item) => !item.fieldPath)) {
                    validator.addError('Field path in group fields can not be empty');
                }
            }
        } catch (error) {
            validator.addError(`Unhandled exception ${validator.getErrorMessage(error)}`);
        }
    }
}
