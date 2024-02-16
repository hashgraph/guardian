import { BlockValidator, IBlockProp } from '@policy-engine/block-validators';
import { CommonBlock } from './common';

/**
 * Timer block
 */
export class TimerBlock {
    /**
     * Block type
     */
    public static readonly blockType: string = 'timerBlock';

    /**
     * Validate block options
     * @param validator
     * @param config
     */
    public static async validate(validator: BlockValidator, ref: IBlockProp): Promise<void> {
        try {
            await CommonBlock.validate(validator, ref);
            if (!ref.options.startDate) {
                validator.addError('Option "startDate" is not set');
            } else if (typeof ref.options.startDate !== 'string') {
                validator.addError('Option "startDate" must be a string');
            }
            if (!ref.options.period) {
                validator.addError('Option "period" is not set');
            } else if (typeof ref.options.period !== 'string') {
                validator.addError('Option "period" must be a string');
            }
        } catch (error) {
            validator.addError(`Unhandled exception ${validator.getErrorMessage(error)}`);
        }
    }
}
