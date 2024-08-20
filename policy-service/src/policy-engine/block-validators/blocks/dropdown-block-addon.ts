import { BlockValidator, IBlockProp } from '../../block-validators/index.js';
import { CommonBlock } from './common.js';

/**
 * Dropdown block with UI
 */
export class DropdownBlockAddon {
    /**
     * Block type
     */
    public static readonly blockType: string = 'dropdownBlockAddon';

    /**
     * Validate block options
     * @param validator
     * @param config
     */
    public static async validate(validator: BlockValidator, ref: IBlockProp): Promise<void> {
        try {
            await CommonBlock.validate(validator, ref);
            if (!ref.options.optionName) {
                validator.addError('Option name is empty');
            }
            if (!ref.options.optionValue) {
                validator.addError('Option value is empty');
            }
            if (!ref.options.field) {
                validator.addError('Field is empty');
            }
        } catch (error) {
            validator.addError(`Unhandled exception ${validator.getErrorMessage(error)}`);
        }
    }
}
