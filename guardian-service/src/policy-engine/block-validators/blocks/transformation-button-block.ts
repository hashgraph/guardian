import { BlockValidator, IBlockProp } from '../../block-validators/index.js';
import { CommonBlock } from './common.js';

/**
 * Document Transformation Button Block with UI
 */
export class TransformationButtonBlock {
    /**
     * Block type
     */
    public static readonly blockType: string = 'transformationButtonBlock';

    /**
     * Validate block options
     * @param validator
     * @param config
     */
    public static async validate(validator: BlockValidator, ref: IBlockProp): Promise<void> {
        try {
            await CommonBlock.validate(validator, ref);
            if(!ref.options.url) {
                validator.addError('Option "url" is not set');
            }
        } catch (error) {
            validator.addError(`Unhandled exception ${validator.getErrorMessage(error)}`);
        }
    }
}
