import { BlockValidator, IBlockProp } from '../../block-validators/index.js';
import { CommonBlock } from './common.js';

/**
 * Request VC document block addon
 */
export class RequestVcDocumentBlockAddon {
    /**
     * Block type
     */
    public static readonly blockType: string = 'requestVcDocumentBlockAddon';

    /**
     * Validate block options
     * @param validator
     * @param config
     */
    public static async validate(
        validator: BlockValidator,
        ref: IBlockProp
    ): Promise<void> {
        try {
            await CommonBlock.validate(validator, ref);
            validator.checkBlockError(
                validator.validateSchemaVariable(
                    'schema',
                    ref.options.schema,
                    true
                )
            );
            validator.checkBlockError(
                validator.validateSchemaVariable(
                    'presetSchema',
                    ref.options.presetSchema,
                    ref.options.preset
                )
            );
            if (!ref.options.buttonName) {
                validator.addError('Button name is empty');
            }
            if (!ref.options.dialogTitle) {
                validator.addError('Dialog title is empty');
            }
        } catch (error) {
            validator.addError(
                `Unhandled exception ${validator.getErrorMessage(error)}`
            );
        }
    }
}
