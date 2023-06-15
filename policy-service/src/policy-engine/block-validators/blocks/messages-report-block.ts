import { BlockValidator, IBlockProp } from '@policy-engine/block-validators';

/**
 * Report block
 */
export class MessagesReportBlock {
    /**
     * Block type
     */
    public static readonly blockType: string = 'messagesReportBlock';

    /**
     * Validate block options
     * @param validator
     * @param config
     */
    public static async validate(validator: BlockValidator, ref: IBlockProp): Promise<void> {
        return;
    }
}
