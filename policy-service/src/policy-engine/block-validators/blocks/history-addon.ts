import { BlockValidator, IBlockProp } from '@policy-engine/block-validators';

/**
 * History Addon
 */
export class HistoryAddon { 
    public static readonly blockType: string = 'historyAddon';
        
    /**
     * Validate block options
     * @param validator
     * @param config
     */
    public static async validate(validator: BlockValidator, ref: IBlockProp): Promise<void> {

    }
}
