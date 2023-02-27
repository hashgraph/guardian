import { BlockValidator, IBlockProp } from '@policy-engine/block-validators';

/**
 * Report block
 */
export class ReportBlock {
    public static readonly blockType: string = 'reportBlock';
    
    /**
     * Validate block options
     * @param validator
     * @param config
     */
    public static async validate(validator: BlockValidator, ref: IBlockProp): Promise<void> {

    }
}
