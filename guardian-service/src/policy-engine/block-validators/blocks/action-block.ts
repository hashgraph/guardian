import { BlockValidator, IBlockProp } from '@policy-engine/block-validators';
import { CommonBlock } from './common';

/**
 * Document action clock with UI
 */
export class InterfaceDocumentActionBlock {
    /**
     * Block type
     */
    public static readonly blockType: string = 'interfaceActionBlock';

    /**
     * Validate block options
     * @param validator
     * @param config
     */
    public static async validate(validator: BlockValidator, ref: IBlockProp): Promise<void> {
        try {
            await CommonBlock.validate(validator, ref);
            if (!ref.options.type) {
                validator.addError('Option "type" is not set');
            } else {
                switch (ref.options.type) {
                    case 'selector':
                        if (!ref.options.uiMetaData || (typeof ref.options.uiMetaData !== 'object')) {
                            validator.addError('Option "uiMetaData" is not set');
                        } else {
                            if (!ref.options.field) {
                                validator.addError('Option "field" is not set');
                            }
                            if (!ref.options.uiMetaData.options) {
                                validator.addError('Option "uiMetaData.options" is not set');
                            }
                            if (Array.isArray(ref.options.uiMetaData.options)) {
                                const tagMap = {};
                                for (const option of ref.options.uiMetaData.options) {
                                    if (!option.tag) {
                                        validator.addError(`Option "tag" is not set`);
                                    }

                                    if (tagMap[option.tag]) {
                                        validator.addError(`Option Tag ${option.tag} already exist`);
                                    }

                                    tagMap[option.tag] = true;
                                }
                            } else {
                                validator.addError('Option "uiMetaData.options" must be an array');
                            }
                        }
                        break;

                    case 'download':
                        if (!ref.options.targetUrl) {
                            validator.addError('Option "targetUrl" is not set');
                        }
                        validator.checkBlockError(
                            validator.validateSchemaVariable('schema', ref.options.schema, true)
                        );
                        break;

                    case 'dropdown':
                        if (!ref.options.name) {
                            validator.addError('Option "name" is not set');
                            break;
                        }
                        if (!ref.options.value) {
                            validator.addError('Option "value" is not set');
                            break;
                        }
                        break;

                    default:
                        validator.addError('Option "type" must be a "selector|download|dropdown"');
                }
            }
        } catch (error) {
            validator.addError(`Unhandled exception ${validator.getErrorMessage(error)}`);
        }
    }
}
