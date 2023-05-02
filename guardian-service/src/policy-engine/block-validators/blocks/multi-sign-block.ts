import { BlockValidator, IBlockProp } from '@policy-engine/block-validators';

/**
 * Switch block
 */
export class MultiSignBlock {
    /**
     * Block type
     */
    public static readonly blockType: string = 'multiSignBlock';

    /**
     * Validate block options
     * @param validator
     * @param config
     */
    public static async validate(validator: BlockValidator, ref: IBlockProp): Promise<void> {
        try {
            if (!ref.options.threshold) {
                validator.addError('Option "threshold" is not set');
            } else {
                try {
                    const t = parseFloat(ref.options.threshold);
                    if (t < 0 || t > 100) {
                        validator.addError('"threshold" value must be between 0 and 100');
                    }
                } catch (error) {
                    validator.addError('Option "threshold" must be a number');
                }
            }
        } catch (error) {
            validator.addError(`Unhandled exception ${validator.getErrorMessage(error)}`);
        }
    }
}
