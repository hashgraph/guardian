import { BlockValidator, IBlockProp } from '@policy-engine/block-validators';

/**
 * Reassigning block
 */
export class ReassigningBlock {
    /**
     * Block type
     */
    public static readonly blockType: string = 'reassigningBlock';

    /**
     * Validate block options
     * @param validator
     * @param config
     */
    public static async validate(validator: BlockValidator, ref: IBlockProp): Promise<void> {
        return;
    }
}