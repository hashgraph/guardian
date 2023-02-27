import { BlockValidator, IBlockProp } from '@policy-engine/block-validators';

/**
 * Split block
 */
export class SplitBlock {
    public static readonly blockType: string = 'splitBlock';

    /**
     * Validate block options
     * @param validator
     * @param config
     */
    public static async validate(validator: BlockValidator, ref: IBlockProp): Promise<void> {
        try {
            if (!ref.options.threshold) {
                validator.addError('Option "threshold" does not set');
            } else {
                try {
                    parseFloat(ref.options.threshold);
                } catch (error) {
                    validator.addError('Option "threshold" must be a Number');
                }
            }
        } catch (error) {
            validator.addError(`Unhandled exception ${validator.getErrorMessage(error)}`);
        }
    }
}
