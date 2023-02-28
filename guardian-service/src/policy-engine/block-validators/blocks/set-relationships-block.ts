import { BlockValidator, IBlockProp } from '@policy-engine/block-validators';

/**
 * Set document relationships action
 */
export class SetRelationshipsBlock {
    /**
     * Block type
     */
    public static readonly blockType: string = 'setRelationshipsBlock';

    /**
     * Validate block options
     * @param validator
     * @param config
     */
    public static async validate(validator: BlockValidator, ref: IBlockProp): Promise<void> {
        return;
    }
}
