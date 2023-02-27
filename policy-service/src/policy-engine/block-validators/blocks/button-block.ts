import { BlockValidator, IBlockProp } from '@policy-engine/block-validators';

/**
 * Document Buttons with UI
 */
export class ButtonBlock {
    public static readonly blockType: string = 'buttonBlock';

    /**
     * Validate block options
     * @param validator
     * @param config
     */
    public static async validate(validator: BlockValidator, ref: IBlockProp): Promise<void> {
        try {
            if (!ref.options.uiMetaData || (typeof ref.options.uiMetaData !== 'object')) {
                validator.addError('Option "uiMetaData" does not set');
            } else {
                if (Array.isArray(ref.options.uiMetaData.buttons)) {
                    for (const button of ref.options.uiMetaData.buttons) {
                        if (!button.tag) {
                            validator.addError('Option "tag" does not set');
                        }
                        if (Array.isArray(button.filters)) {
                            for (const filter of button.filters) {
                                if (!filter.type) {
                                    validator.addError('Option "type" does not set');
                                }
                                if (!filter.field) {
                                    validator.addError('Option "field" does not set');
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
                                    validator.addError('Option "title" does not set');
                                }
                                if (!button.description) {
                                    validator.addError('Option "description" does not set');
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
