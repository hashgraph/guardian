import { BlockValidator, IBlockProp } from '@policy-engine/block-validators';

/**
 * Container block with UI
 */
export class InterfaceContainerBlock {
    /**
     * Block type
     */
    public static readonly blockType: string = 'interfaceContainerBlock';

    /**
     * Validate block options
     * @param validator
     * @param config
     */
    public static async validate(validator: BlockValidator, ref: IBlockProp): Promise<void> {
        return;
    }
}
