import { BlockValidator, IBlockProp } from '@policy-engine/block-validators';

/**
 * Pagination addon
 */
export class PaginationAddon {
    public static readonly blockType: string = 'paginationAddon';
    
    /**
     * Validate block options
     * @param validator
     * @param config
     */
    public static async validate(validator: BlockValidator, ref: IBlockProp): Promise<void> {

    }
}
