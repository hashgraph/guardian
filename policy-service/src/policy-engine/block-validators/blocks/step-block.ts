import { BlockValidator, IBlockProp } from '@policy-engine/block-validators';

/**
 * Step block
 */
export class InterfaceStepBlock {
    public static readonly blockType: string = 'interfaceStepBlock';
    
    /**
     * Validate block options
     * @param validator
     * @param config
     */
    public static async validate(validator: BlockValidator, ref: IBlockProp): Promise<void> {

    }
}
