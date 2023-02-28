import { BlockValidator, IBlockProp } from '@policy-engine/block-validators';

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
            const types = [
                'vc-document',
                'vp-document',
                'related-vc-document',
                'related-vp-document'
            ];
            if (types.indexOf(ref.options.documentType) === -1) {
                validator.addError('Option "documentType" must be one of ' + types.join(','));
            }

            if (ref.options.schema) {
                if (typeof ref.options.schema !== 'string') {
                    validator.addError('Option "schema" must be a string');
                    return;
                }
                if (await validator.schemaNotExist(ref.options.schema)) {
                    validator.addError(`Schema with id "${ref.options.schema}" does not exist`);
                    return;
                }
            }

            if (ref.options.conditions && !Array.isArray(ref.options.conditions)) {
                validator.addError(`conditions option must be an array`);
            }
        } catch (error) {
            validator.addError(`Unhandled exception ${validator.getErrorMessage(error)}`);
        }
    }
}
