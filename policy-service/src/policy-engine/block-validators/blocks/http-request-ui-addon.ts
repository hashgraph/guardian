import { BlockValidator, IBlockProp } from '../index.js';
import { CommonBlock } from './common.js';

/**
 * Http Request UI Addon
 */
export class HttpRequestUIAddon {
    /**
     * Block type
     */
    public static readonly blockType: string = 'httpRequestUIAddon';

    /**
     * Validate block options
     * @param validator
     * @param config
     */
    public static async validate(validator: BlockValidator, ref: IBlockProp): Promise<void> {
        try {
            await CommonBlock.validate(validator, ref);

            if (!ref.options.url) {
                validator.addError('Url can not be empty');
            } else if (!HttpRequestUIAddon.isValidUrl(ref.options.url)) {
                validator.addError('"Url" is not valid');
            }

            const t = ['get', 'post', 'put'];
            if (t.indexOf(ref.options.method) === -1) {
                validator.addError(`Option "method" must be one of ${t.join('|')}`);
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
