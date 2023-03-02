import { BlockValidator, IBlockProp } from '@policy-engine/block-validators';

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
            if (!ref.options.type) {
                validator.addError('Option "type" does not set');
            } else {
                switch (ref.options.type) {
                    case 'selector':
                        if (!ref.options.uiMetaData || (typeof ref.options.uiMetaData !== 'object')) {
                            validator.addError('Option "uiMetaData" does not set');
                        } else {
                            if (!ref.options.field) {
                                validator.addError('Option "field" does not set');
                            }
                            if (!ref.options.uiMetaData.options) {
                                validator.addError('Option "uiMetaData.options" does not set');
                            }
                            if (Array.isArray(ref.options.uiMetaData.options)) {
                                const tagMap = {};
                                for (const option of ref.options.uiMetaData.options) {
                                    if (!option.tag) {
                                        validator.addError(`Option "tag" does not set`);
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
                            validator.addError('Option "targetUrl" does not set');
                        }

                        if (!ref.options.schema) {
                            validator.addError('Option "schema" does not set');
                            break;
                        }
                        if (typeof ref.options.schema !== 'string') {
                            validator.addError('Option "schema" must be a string');
                            break;
                        }

                        if (await validator.schemaNotExist(ref.options.schema)) {
                            validator.addError(`Schema with id "${ref.options.schema}" does not exist`);
                            break;
                        }
                        break;

                    case 'dropdown':
                        if (!ref.options.name) {
                            validator.addError('Option "name" does not set');
                            break;
                        }
                        if (!ref.options.value) {
                            validator.addError('Option "value" does not set');
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
