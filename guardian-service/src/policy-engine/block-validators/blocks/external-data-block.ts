import { BlockValidator, IBlockProp } from '@policy-engine/block-validators';
import { CommonBlock } from './common';

/**
 * External data block
 */
export class ExternalDataBlock {
    /**
     * Block type
     */
    public static readonly blockType: string = 'externalDataBlock';

    /**
     * Validate block options
     * @param validator
     * @param config
     */
    public static async validate(validator: BlockValidator, ref: IBlockProp): Promise<void> {
        try {
            await CommonBlock.validate(validator, ref);
            if (ref.options.schema) {
                if (typeof ref.options.schema !== 'string') {
                    validator.addError('Option "schema" must be a string');
                    return;
                }
                if (validator.schemaNotExist(ref.options.schema)) {
                    validator.addError(`Schema with id "${ref.options.schema}" does not exist`);
                    return;
                }
            }
        } catch (error) {
            validator.addError(`Unhandled exception ${validator.getErrorMessage(error)}`);
        }
    }
}
