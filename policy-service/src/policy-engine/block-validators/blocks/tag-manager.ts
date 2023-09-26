import { BlockValidator, IBlockProp } from '@policy-engine/block-validators';

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
        return;
    }
}