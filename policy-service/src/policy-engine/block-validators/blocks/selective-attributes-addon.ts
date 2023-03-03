import { BlockValidator, IBlockProp } from '@policy-engine/block-validators';

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
        return;
    }
}
