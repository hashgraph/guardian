import { BlockValidator, IBlockProp } from '../../block-validators/index.js';
import { CommonBlock } from './common.js';

/**
 * Document Buttons with UI
 */
export class ButtonBlock {
    /**
     * Block type
     */
    public static readonly blockType: string = 'buttonBlock';

    /**
     * Validate block options
     * @param validator
     * @param config
     */
    public static async validate(validator: BlockValidator, ref: IBlockProp): Promise<void> {
        try {
            await CommonBlock.validate(validator, ref);
            if (!ref.options.uiMetaData || (typeof ref.options.uiMetaData !== 'object')) {
                validator.addError('Option "uiMetaData" is not set');
            } else {
                if (Array.isArray(ref.options.uiMetaData.buttons)) {
                    for (const button of ref.options.uiMetaData.buttons) {
                        if (!button.tag) {
                            validator.addError('Option "tag" is not set');
                        }
                        if (Array.isArray(button.filters)) {
                            for (const filter of button.filters) {
                                if (!filter.type) {
                                    validator.addError('Option "type" is not set');
                                }
                                if (!filter.field) {
                                    validator.addError('Option "field" is not set');
                                }
                            }
                        }
                        else {
                            validator.addError('Option "button.filters" must be an array');
                        }
                        switch (button.type) {
                            case 'selector':
                                break;
                            case 'selector-dialog':
                                if (!button.title) {
                                    validator.addError('Option "title" is not set');
                                }
                                if (!button.description) {
                                    validator.addError('Option "description" is not set');
                                }
                                break;
                            default:
                                validator.addError('Option "type" must be a "selector|selector-dialog"');
                        }
                    }
                } else {
                    validator.addError('Option "uiMetaData.buttons" must be an array');
                }
            }
        } catch (error) {
            validator.addError(`Unhandled exception ${validator.getErrorMessage(error)}`);
        }
    }
}
