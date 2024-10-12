import { BlockValidator, IBlockProp } from '../../block-validators/index.js';
import { CommonBlock } from './common.js';

/**
 * Http request block
 */
export class HttpRequestBlock {
    /**
     * Block type
     */
    public static readonly blockType: string = 'httpRequestBlock';

    /**
     * Validate block options
     * @param validator
     * @param config
     */
    public static async validate(validator: BlockValidator, ref: IBlockProp): Promise<void> {
        try {
            await CommonBlock.validate(validator, ref);

            if (!ref.options.url?.trim()) {
                validator.addError('Option "url" must be set');
            }

            if (!['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].find(item => item === ref.options.method?.toUpperCase())) {
                validator.addError(`Option "method" must be "GET", "POST", "PUT", "PATCH" or "DELETE"`);
            }
        } catch (error) {
            validator.addError(
                `Unhandled exception ${validator.getErrorMessage(error)}`
            );
        }
    }
}
