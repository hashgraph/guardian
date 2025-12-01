import { BlockValidator, IBlockProp } from '../index.js';
import { CommonBlock } from './common.js';

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
        } catch (error) {
            validator.addError(`Unhandled exception ${validator.getErrorMessage(error)}`);
        }
    }
}
