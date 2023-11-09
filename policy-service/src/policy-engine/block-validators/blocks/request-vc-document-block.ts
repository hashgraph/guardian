import { BlockValidator, IBlockProp } from '@policy-engine/block-validators';
import { CommonBlock } from './common';

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
            await CommonBlock.validate(validator, ref);
            validator.checkBlockError(
                validator.validateSchemaVariable('schema', ref.options.schema, true)
            );
            validator.checkBlockError(
                validator.validateSchemaVariable('presetSchema', ref.options.presetSchema, false)
            );
        } catch (error) {
            validator.addError(`Unhandled exception ${validator.getErrorMessage(error)}`);
        }
    }
}