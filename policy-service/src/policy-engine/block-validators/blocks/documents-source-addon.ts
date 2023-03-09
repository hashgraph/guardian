import { BlockValidator, IBlockProp } from '@policy-engine/block-validators';

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
        } catch (error) {
            validator.addError(`Unhandled exception ${validator.getErrorMessage(error)}`);
        }
    }
}
