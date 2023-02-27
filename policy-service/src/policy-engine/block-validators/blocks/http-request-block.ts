import { BlockValidator, IBlockProp } from '@policy-engine/block-validators';

/**
 * Http request block
 */
export class HttpRequestBlock {
    public static readonly blockType: string = 'httpRequestBlock';

    /**
     * Validate block options
     * @param validator
     * @param config
     */
    public static async validate(validator: BlockValidator, ref: IBlockProp): Promise<void> {
        if (!ref.options.url?.trim()) {
            validator.addError('Option "url" must be set');
        }

        if (!['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].find(item => item === ref.options.method?.toUpperCase())) {
            validator.addError(`Option "method" must be "GET", "POST", "PUT", "PATCH" or "DELETE"`);
        }
    }

}
