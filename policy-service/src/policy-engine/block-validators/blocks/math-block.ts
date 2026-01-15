import { BlockValidator, IBlockProp } from '../index.js';
import { CommonBlock } from './common.js';
import { MathGroup, Code } from '../../helpers/math-model/index.js';

/**
 * Math block
 */
export class MathBlock {
    /**
     * Block type
     */
    public static readonly blockType: string = 'mathBlock';

    /**
     * Validate block options
     * @param validator
     * @param config
     */
    public static async validate(validator: BlockValidator, ref: IBlockProp): Promise<void> {
        try {
            await CommonBlock.validate(validator, ref);

            const inputSchemaError = validator.validateSchemaVariable('inputSchema', ref.options.inputSchema, true);
            if (inputSchemaError) {
                validator.addError(inputSchemaError);
                return;
            }

            const inputSchema = validator.getSchema(ref.options.inputSchema);
            if (!inputSchema) {
                validator.addError(`Schema with id "${ref.options.inputSchema}" does not exist`);
                return;
            }

            if (ref.options.outputSchema) {
                const outputSchemaError = validator.validateSchemaVariable('outputSchema', ref.options.outputSchema, true);
                if (outputSchemaError) {
                    validator.addError(outputSchemaError);
                    return;
                }

                const outputSchema = validator.getSchema(ref.options.outputSchema);
                if (!outputSchema) {
                    validator.addError(`Schema with id "${ref.options.outputSchema}" does not exist`);
                    return;
                }
            }

            if (!ref.options.expression) {
                validator.addError('Option "expression" is not set');
                return;
            }

            const group = MathGroup.from(ref.options.expression);
            const groupError = group.validate();
            if (groupError) {
                validator.addError('Option "expression" is incorrect');
                return;
            }

            const code = Code.from(ref.options.expression);
            if (code) {
                const codeError = code.validate();
                if (codeError) {
                    validator.addError('Option "expression" is incorrect');
                    return;
                }
            }
        } catch (error) {
            validator.addError(`Unhandled exception ${validator.getErrorMessage(error)}`);
        }
    }
}
