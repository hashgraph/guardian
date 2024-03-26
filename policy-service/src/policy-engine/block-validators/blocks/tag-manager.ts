import { BlockValidator, IBlockProp } from '../../block-validators/index.js';
import { CommonBlock } from './common.js';

/**
 * Container block with UI
 */
export class TagsManagerBlock {
    /**
     * Block type
     */
    public static readonly blockType: string = 'tagsManager';

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
