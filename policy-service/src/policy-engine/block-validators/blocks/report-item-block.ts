import { BlockValidator, IBlockProp } from '@policy-engine/block-validators';

/**
 * Report item block
 */
export class ReportItemBlock {
    public static readonly blockType: string = 'reportItemBlock';
    
    /**
     * Validate block options
     * @param validator
     * @param config
     */
    public static async validate(validator: BlockValidator, ref: IBlockProp): Promise<void> {

    }
}
