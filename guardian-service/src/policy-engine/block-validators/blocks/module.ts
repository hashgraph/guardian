import { BlockValidator, IBlockProp } from '@policy-engine/block-validators';

/**
 * Policy roles block
 */
export class ModuleBlock {
    /**
     * Block type
     */
    public static readonly blockType: string = 'module';

    /**
     * Validate block options
     * @param validator
     * @param config
     */
    public static async validate(validator: BlockValidator, ref: IBlockProp): Promise<void> {
        if (Array.isArray(ref.options.variables)) {
            for (const variable of ref.options.variables) {
                if (!ref.options[variable.name]) {
                    validator.addError(`Option "${variable.name}" does not set`);
                }
            }
        }
    }
}
