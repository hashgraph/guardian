import { BlockValidator, IBlockProp } from '../index.js';
import { CommonBlock } from './common.js';

/**
 * Request Validation Addon
 */
export class RequestValidationAddon {
    /**
     * Block type
     */
    public static readonly blockType: string = 'requestValidationAddon';

    /**
     * Validate block options
     * @param validator
     * @param ref
     */
    public static async validate(validator: BlockValidator, ref: IBlockProp): Promise<void> {
        try {
            await CommonBlock.validate(validator, ref);

            const { validations } = ref.options;

            if (validations !== undefined && !Array.isArray(validations)) {
                validator.addError('Option "validations" must be an array');
                return;
            }

            const allowedCollections = ['VcDocument', 'VpDocument'];

            for (const item of (validations || [])) {
                if (!allowedCollections.includes(item.dbCollection)) {
                    validator.addError(
                        `Option "dbCollection" must be one of ${allowedCollections.join('|')}`
                    );
                }

                if (item.filters !== undefined && !Array.isArray(item.filters)) {
                    validator.addError('Option "filters" must be an array');
                }

                if (item.conditions !== undefined && !Array.isArray(item.conditions)) {
                    validator.addError('Option "conditions" must be an array');
                }
            }
        } catch (error) {
            validator.addError(`Unhandled exception ${validator.getErrorMessage(error)}`);
        }
    }
}
