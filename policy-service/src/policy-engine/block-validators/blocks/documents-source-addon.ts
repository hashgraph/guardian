import { BlockValidator, IBlockProp } from '../../block-validators/index.js';
import { CommonBlock } from './common.js';

/**
 * Documents source addon
 */
export class DocumentsSourceAddon {
    /**
     * Block type
     */
    public static readonly blockType: string = 'documentsSourceAddon';

    /**
     * Validate block options
     * @param validator
     * @param config
     */
    public static async validate(validator: BlockValidator, ref: IBlockProp): Promise<void> {
        try {
            await CommonBlock.validate(validator, ref);
            const types = [
                'vc-documents',
                'did-documents',
                'vp-documents',
                'root-authorities',
                'standard-registries',
                'approve',
                'source'
            ];
            if (types.indexOf(ref.options.dataType) === -1) {
                validator.addError('Option "dataType" must be one of ' + types.join(','));
            }
            validator.checkBlockError(
                validator.validateSchemaVariable('schema', ref.options.schema, false)
            );
        } catch (error) {
            validator.addError(`Unhandled exception ${validator.getErrorMessage(error)}`);
        }
    }
}
