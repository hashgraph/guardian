import { BlockValidator, IBlockProp } from '@policy-engine/block-validators';
import { CommonBlock } from './common';

/**
 * External topic block
 */
export class ExternalTopicBlock {
    /**
     * Block type
     */
    public static readonly blockType: string = 'externalTopicBlock';

    /**
     * Validate block options
     * @param validator
     * @param config
     */
    public static async validate(validator: BlockValidator, ref: IBlockProp): Promise<void> {
        try {
            await CommonBlock.validate(validator, ref);
            validator.checkBlockError(
                validator.validateSchemaVariable('schema', ref.options.schema, false)
            );
        } catch (error) {
            validator.addError(`Unhandled exception ${validator.getErrorMessage(error)}`);
        }
    }
}
