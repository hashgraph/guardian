import { IntegrationServiceFactory } from '@guardian/common';
import { BlockValidator, IBlockProp } from '../../block-validators/index.js';
import { CommonBlock } from './common.js';

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

            if (validator.schemaNotExist('#IntegrationData')) {
                validator.addError('Policy outdated. Re-import required — IntegrationData schema unavailable');
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
                    Object.values(parentWrapper || {}).forEach(({ name, value, required }) => {
                        if (!!required && !ref.options.requestParams?.[`path_${value}`] && !ref.options.requestParams?.[value]) {
                            validator.addError(`Option "Path field for ${name}" or "Value for ${name}" is not set`);
                        }
                    });
                });
            }
        } catch (error) {
            validator.addError(`Unhandled exception ${validator.getErrorMessage(error)}`);
        }
    }
}
