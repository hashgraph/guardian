import { BlockValidator, IBlockProp } from '@policy-engine/block-validators';
import { CommonBlock } from './common';

/**
 * Document Validator
 */
export class DocumentValidatorBlock {
    /**
     * Block type
     */
    public static readonly blockType: string = 'documentValidatorBlock';

    /**
     * Validate block options
     * @param validator
     * @param config
     */
    public static async validate(validator: BlockValidator, ref: IBlockProp): Promise<void> {
        try {
            await CommonBlock.validate(validator, ref);
            const types = [
                'vc-document',
                'vp-document',
                'related-vc-document',
                'related-vp-document'
            ];
            if (types.indexOf(ref.options.documentType) === -1) {
                validator.addError('Option "documentType" must be one of ' + types.join(','));
            }

            validator.checkBlockError(
                validator.validateSchemaVariable('schema', ref.options.schema, false)
            );

            if (ref.options.conditions && !Array.isArray(ref.options.conditions)) {
                validator.addError(`conditions option must be an array`);
            }
        } catch (error) {
            validator.addError(`Unhandled exception ${validator.getErrorMessage(error)}`);
        }
    }
}
