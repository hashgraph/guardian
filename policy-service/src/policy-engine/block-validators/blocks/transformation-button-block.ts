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
            if (!ref.options.url) {
                validator.addError('Option "url" is not set');
            }
            else if (!TransformationButtonBlock.isValidUrl(ref.options.url)) {
                validator.addError('"Url" is not valid');
            }
        } catch (error) {
            validator.addError(`Unhandled exception ${validator.getErrorMessage(error)}`);
        }
    }

    private static isValidUrl(url: any) {
        try {
            // tslint:disable-next-line:no-unused-expression
            new URL(url);
            return true;
        } catch (_) {
            return false;
        }
    }
}
