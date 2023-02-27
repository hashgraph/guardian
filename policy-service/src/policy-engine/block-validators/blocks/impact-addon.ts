import { BlockValidator, IBlockProp, PropertyValidator } from '@policy-engine/block-validators';

/**
 * Calculate math addon
 */
export class TokenOperationAddon {
    public static readonly blockType: string = 'impactAddon';

    /**
     * Validate block options
     * @param validator
     * @param config
     */
    public static async validate(validator: BlockValidator, ref: IBlockProp): Promise<void> {
        try {
            validator.checkBlockError(
                PropertyValidator.inputValidator('amount', ref.options.amount, 'string')
            );
            validator.checkBlockError(
                PropertyValidator.selectValidator('impactType', ref.options.impactType, ['Primary Impacts', 'Secondary Impacts'])
            );
        } catch (error) {
            validator.addError(`Unhandled exception ${validator.getErrorMessage(error)}`);
        }
    }
}
