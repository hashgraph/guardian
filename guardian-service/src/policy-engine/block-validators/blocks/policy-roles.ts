import { BlockValidator, IBlockProp } from '@policy-engine/block-validators';

/**
 * Policy roles block
 */
export class PolicyRolesBlock {
    public static readonly blockType: string = 'policyRolesBlock';
    
    /**
     * Validate block options
     * @param validator
     * @param config
     */
    public static async validate(validator: BlockValidator, ref: IBlockProp): Promise<void> {

    }
}
