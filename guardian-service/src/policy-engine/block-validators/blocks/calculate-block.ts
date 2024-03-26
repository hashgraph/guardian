import { BlockValidator, IBlockProp } from '../../block-validators/index.js';
import { CalculateMathAddon } from './calculate-math-addon.js';
import { CalculateMathVariables } from './calculate-math-variables.js';
import { Schema } from '@guardian/interfaces';
import { CommonBlock } from './common.js';

/**
 * Calculate block
 */
export class CalculateContainerBlock {
    /**
     * Block type
     */
    public static readonly blockType: string = 'calculateContainerBlock';

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

            let variables: any = {};
            if (ref.options.inputFields) {
                for (const field of ref.options.inputFields) {
                    variables[field.value] = field.name;
                }
            }

            for (const addon of ref.children) {
                if (addon.blockType === 'calculateMathAddon') {
                    variables = CalculateMathAddon.getVariables(addon, variables);
                }
                if (addon.blockType === 'calculateMathVariables') {
                    variables = CalculateMathVariables.getVariables(addon, variables);
                }
            }

            const map = {};
            if (ref.options.outputFields) {
                for (const field of ref.options.outputFields) {
                    if (!field.value) {
                        continue;
                    }
                    if (!variables.hasOwnProperty(field.value)) {
                        validator.addError(`Variable ${field.value} not defined`);
                        return;
                    }
                    map[field.name] = true;
                }
            }

            const outputSchema = validator.getSchema(ref.options.outputSchema);
            if (!outputSchema) {
                validator.addError(`Schema with id "${ref.options.outputSchema}" does not exist`);
                return;
            }
            const schema = new Schema(outputSchema);
            for (const field of schema.fields) {
                if (field.required && !map[field.name]) {
                    validator.addError(`${field.description} is required`);
                    return
                }
            }
        } catch (error) {
            validator.addError(`Unhandled exception ${validator.getErrorMessage(error)}`);
        }
    }
}
