import { BlockValidator, IBlockProp } from '@policy-engine/block-validators';

/**
 * Document action clock with UI
 */
export class GroupManagerBlock {
    public static readonly blockType: string = 'groupManagerBlock';
    
    /**
     * Validate block options
     * @param validator
     * @param config
     */
    public static async validate(validator: BlockValidator, ref: IBlockProp): Promise<void> {

    }
}
