import { BlockValidator, IBlockProp } from '@policy-engine/block-validators';

/**
 * Request VC document block
 */
export class RequestVcDocumentBlock {
    /**
     * Block type
     */
    public static readonly blockType: string = 'requestVcDocumentBlock';

    /**
     * Validate block options
     * @param validator
     * @param config
     */
    public static async validate(validator: BlockValidator, ref: IBlockProp): Promise<void> {
        try {
            // Test schema options
            if (!ref.options.schema) {
                validator.addError('Option "schema" is not set');
                return;
            }
            if (typeof ref.options.schema !== 'string') {
                validator.addError('Option "schema" must be a string');
                return;
            }

            if (await validator.schemaNotExist(ref.options.schema)) {
                validator.addError(`Schema with id "${ref.options.schema}" does not exist`);
                return;
            }
            if (ref.options.presetSchema) {
                if (await validator.schemaNotExist(ref.options.presetSchema)) {
                    validator.addError(`Schema with id "${ref.options.presetSchema}" does not exist`);
                    return;
                }
            }
        } catch (error) {
            validator.addError(`Unhandled exception ${validator.getErrorMessage(error)}`);
        }
    }
}