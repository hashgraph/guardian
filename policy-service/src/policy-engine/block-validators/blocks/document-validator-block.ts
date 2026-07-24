import { BlockValidator, IBlockProp } from '../../block-validators/index.js';
import { CommonBlock } from './common.js';

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

            const allowedCollections = ['VcDocument', 'VpDocument'];
            if (ref.options.sourceValidations !== undefined && !Array.isArray(ref.options.sourceValidations)) {
                validator.addError('Option "sourceValidations" must be an array');
            }
            for (const item of (ref.options.sourceValidations || [])) {
                if (!allowedCollections.includes(item.dbCollection)) {
                    validator.addError(`Option "dbCollection" must be one of ${allowedCollections.join('|')}`);
                }
                if (item.filters !== undefined && !Array.isArray(item.filters)) {
                    validator.addError('Option "filters" must be an array');
                }
                if (item.conditions !== undefined && !Array.isArray(item.conditions)) {
                    validator.addError('Option "conditions" must be an array');
                }
            }
        } catch (error) {
            validator.addError(`Unhandled exception ${validator.getErrorMessage(error)}`);
        }
    }
}
