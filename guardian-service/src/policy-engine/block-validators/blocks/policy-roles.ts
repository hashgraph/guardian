import { BlockValidator, IBlockProp } from '@policy-engine/block-validators';

/**
 * Policy roles block
 */
export class PolicyRolesBlock {
    /**
     * Block type
     */
    public static readonly blockType: string = 'policyRolesBlock';

    /**
     * Validate block options
     * @param validator
     * @param config
     */
    public static async validate(validator: BlockValidator, ref: IBlockProp): Promise<void> {
        return;
    }
}
