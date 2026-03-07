import { BlockValidator, IBlockProp } from '../index.js';
import { CommonBlock } from './common.js';

/**
 * IPFS Transformation UI Addon
 */
export class IpfsTransformationUIAddon {
    /**
     * Block type
     */
    public static readonly blockType: string = 'ipfsTransformationUIAddon';

    /**
     * Validate block options
     * @param validator
     * @param config
     */
    public static async validate(validator: BlockValidator, ref: IBlockProp): Promise<void> {
        try {
            await CommonBlock.validate(validator, ref);
        } catch (error) {
            validator.addError(`Unhandled exception ${validator.getErrorMessage(error)}`);
        }
    }
}
