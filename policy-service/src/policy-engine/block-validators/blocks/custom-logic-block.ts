import { BlockValidator, IBlockProp } from '@policy-engine/block-validators';

/**
 * Custom logic block
 */
export class CustomLogicBlock {
    public static readonly blockType: string = 'customLogicBlock';

    /**
     * Validate block options
     * @param validator
     * @param config
     */
    public static async validate(validator: BlockValidator, ref: IBlockProp): Promise<void> {

    }
}