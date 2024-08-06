import { BlockValidator, IBlockProp } from '../../block-validators/index.js';
import { CommonBlock } from './common.js';

/**
 * Document Buttons with UI
 */
export class ButtonBlockAddon {
    /**
     * Block type
     */
    public static readonly blockType: string = 'buttonBlockAddon';

    /**
     * Validate block options
     * @param validator
     * @param config
     */
    public static async validate(validator: BlockValidator, ref: IBlockProp): Promise<void> {
        try {
            await CommonBlock.validate(validator, ref);
            if (!ref.options.name) {
                validator.addError('Button name is empty');
            }
            if (ref.options.dialog) {
                if (!ref.options.dialogOptions?.dialogTitle) {
                    validator.addError('Dialog title is empty');
                }
                if (!ref.options.dialogOptions?.dialogDescription) {
                    validator.addError('Dialog description is empty');
                }
                if (!ref.options.dialogOptions?.dialogResultFieldPath) {
                    validator.addError('Dialog result field path is empty');
                }
            }
        } catch (error) {
            validator.addError(`Unhandled exception ${validator.getErrorMessage(error)}`);
        }
    }
}
