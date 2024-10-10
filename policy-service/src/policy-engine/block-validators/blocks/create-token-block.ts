import { BlockValidator, IBlockProp } from '../../block-validators/index.js';
import { CommonBlock } from './common.js';

/**
 * Create Token block
 */
export class CreateTokenBlock {
    /**
     * Block type
     */
    public static readonly blockType: string = 'createTokenBlock';

    /**
     * Validate block options
     * @param validator
     * @param config
     */
    public static async validate(validator: BlockValidator, ref: IBlockProp): Promise<void> {
        try {
            await CommonBlock.validate(validator, ref);
            if (!ref.options.template) {
                validator.addError('Template can not be empty');
                return;
            }
            if (validator.tokenTemplateNotExist(ref.options.template)) {
                validator.addError(`Token "${ref.options.template}" does not exist`);
            }
        } catch (error) {
            validator.addError(`Unhandled exception ${validator.getErrorMessage(error)}`);
        }
    }
}
