import { BlockValidator, IBlockProp } from '@policy-engine/block-validators';
import { CommonBlock } from './common';

/**
 * Split block
 */
export class SplitBlock {
    /**
     * Block type
     */
    public static readonly blockType: string = 'splitBlock';

    /**
     * Validate block options
     * @param validator
     * @param config
     */
    public static async validate(validator: BlockValidator, ref: IBlockProp): Promise<void> {
        try {
            await CommonBlock.validate(validator, ref);
            if (!ref.options.threshold) {
                validator.addError('Option "threshold" is not set');
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
