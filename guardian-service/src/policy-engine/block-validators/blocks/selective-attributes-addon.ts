import { BlockValidator, IBlockProp } from '../index.js';
import { CommonBlock } from './common.js';

/**
 * Selective Attributes
 */
export class SelectiveAttributes {
    /**
     * Block type
     */
    public static readonly blockType: string = 'selectiveAttributes';

    /**
     * Validate block options
     * @param validator
     * @param config
     */
    public static async validate(validator: BlockValidator, ref: IBlockProp): Promise<void> {
        try {
            await CommonBlock.validate(validator, ref);
        } catch (error) {
            validator.addError(
                `Unhandled exception ${validator.getErrorMessage(error)}`
            );
        }
    }
}
