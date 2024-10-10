import { BlockValidator, IBlockProp, PropertyValidator } from '../../block-validators/index.js';
import { CommonBlock } from './common.js';

/**
 * Calculate math addon
 */
export class TokenOperationAddon {
    /**
     * Block type
     */
    public static readonly blockType: string = 'impactAddon';

    /**
     * Validate block options
     * @param validator
     * @param config
     */
    public static async validate(validator: BlockValidator, ref: IBlockProp): Promise<void> {
        try {
            await CommonBlock.validate(validator, ref);

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
