import { IntegrationServiceFactory } from '@guardian/common';
import { BlockValidator, IBlockProp } from '../../block-validators/index.js';
import { CommonBlock } from './common.js';
import { ParseTypes, SchemaEntity } from '@guardian/interfaces';

/**
 * Document Integration Button Block with UI
 */
export class IntegrationButtonBlock {
    /**
     * Block type
     */
    public static readonly blockType: string = 'integrationButtonBlock';

    /**
     * Validate block options
     * @param validator
     * @param config
     */
    public static async validate(validator: BlockValidator, ref: IBlockProp): Promise<void> {
        try {

            await CommonBlock.validate(validator, ref);

            if (validator.schemaNotExistByEntity(SchemaEntity.INTEGRATION_DATA_V2)) {
                validator.addError('Policy outdated. Re-import required — IntegrationDataV2 schema unavailable');
            }

            if(!ref.options.integrationType) {
                validator.addError('Option "Integration" is not set');
            }

            if(!ref.options.requestName) {
                validator.addError('Option "Request type" is not set');
            }

            if (ref.options.integrationType && ref.options.requestName) {
                const requestNameSplited = ref.options.requestName.split('_');
                const methodName = requestNameSplited[requestNameSplited.length - 1];

                const method = IntegrationServiceFactory.getAvailableMethods(ref.options.integrationType)[methodName];

                Object.values(method.parameters || {}).forEach((parentWrapper) => {
                    Object.values(parentWrapper || {}).forEach(({ name, value, required, parseType }) => {
                        if (!!required && !ref.options.requestParams?.[`path_${value}`] && !ref.options.requestParams?.[value]) {
                            validator.addError(`Option "Path field for ${name}" or "Value for ${name}" is not set`);
                        }

                        if (ref.options.requestParams?.[`path_${value}`] && ref.options.requestParams?.[value]) {
                            validator.addError(`Both fields are filled, but only one is allowed — either "Path field for ${name}" or "Value for ${name}"`);
                        }

                        if (parseType) {
                            const valueForParse = ref.options.requestParams?.[`path_${value}`] || ref.options.requestParams?.[value];

                            if (valueForParse) {
                                if (parseType === ParseTypes.JSON) {
                                    try {
                                        JSON.parse(valueForParse);
                                    } catch {
                                        validator.addError(`Option "Path field for ${name}" or "Value for ${name}" is not a stringify object`);
                                    }
                                } else if (parseType === ParseTypes.NUMBER) {
                                    const numberValue = Number(valueForParse);

                                    if (numberValue !== 0 && !numberValue) {
                                        validator.addError(`Option "Path field for ${name}" or "Value for ${name}" is not a number`);
                                    }
                                }
                            }
                        }
                    });
                });
            }
        } catch (error) {
            validator.addError(`Unhandled exception ${validator.getErrorMessage(error)}`);
        }
    }
}
