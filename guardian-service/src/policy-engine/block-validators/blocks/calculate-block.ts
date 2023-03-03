import { BlockValidator, IBlockProp } from '@policy-engine/block-validators';
import { CalculateMathAddon } from './calculate-math-addon';
import { CalculateMathVariables } from './calculate-math-variables';
import { Schema } from '@guardian/interfaces';

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
            // Test schema options
            if (!ref.options.inputSchema) {
                validator.addError('Option "inputSchema" does not set');
                return;
            }
            if (typeof ref.options.inputSchema !== 'string') {
                validator.addError('Option "inputSchema" must be a string');
                return;
            }
            if (await validator.schemaNotExist(ref.options.inputSchema)) {
                validator.addError(`Schema with id "${ref.options.inputSchema}" does not exist`);
                return;
            }

            // Test schema options
            if (!ref.options.outputSchema) {
                validator.addError('Option "outputSchema" does not set');
                return;
            }
            if (typeof ref.options.outputSchema !== 'string') {
                validator.addError('Option "outputSchema" must be a string');
                return;
            }

            if (await validator.schemaNotExist(ref.options.outputSchema)) {
                validator.addError(`Schema with id "${ref.options.outputSchema}" does not exist`);
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

            const outputSchema = await validator.getSchema(ref.options.outputSchema);
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
