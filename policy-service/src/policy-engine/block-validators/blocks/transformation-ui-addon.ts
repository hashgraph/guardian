import { BlockValidator, IBlockProp } from '../index.js';
import { CommonBlock } from './common.js';

/**
 * Transformation UI Addon
 */
export class TransformationUIAddon {
    /**
     * Block type
     */
    public static readonly blockType: string = 'transformationUIAddon';

    /**
     * Validate block options
     * @param validator
     * @param config
     */
    public static async validate(validator: BlockValidator, ref: IBlockProp): Promise<void> {
        try {
            await CommonBlock.validate(validator, ref);

            if (!ref.options.expression) {
                validator.addError('Expression can not be empty');
            }
        } catch (error) {
            validator.addError(`Unhandled exception ${validator.getErrorMessage(error)}`);
        }
    }
}
