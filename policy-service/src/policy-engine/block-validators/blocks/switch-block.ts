import { BlockValidator, IBlockProp } from '../../block-validators/index.js';
import { CommonBlock } from './common.js';

/**
 * Switch block
 */
export class SwitchBlock {
    /**
     * Block type
     */
    public static readonly blockType: string = 'switchBlock';

    /**
     * Validate block options
     * @param validator
     * @param config
     */
    public static async validate(validator: BlockValidator, ref: IBlockProp): Promise<void> {
        try {
            await CommonBlock.validate(validator, ref);
            if (!['firstTrue', 'allTrue'].find(item => item === ref.options.executionFlow)) {
                validator.addError('Option "executionFlow" must be one of firstTrue, allTrue');
            }

            if (!ref.options.conditions) {
                validator.addError('Option "conditions" is not set');
            }

            const tagMap = {};
            if (Array.isArray(ref.options.conditions)) {
                for (const condition of ref.options.conditions) {
                    if (!['equal', 'not_equal', 'unconditional'].find(item => item === condition.type)) {
                        validator.addError('Option "condition.type" must be one of equal, not_equal, unconditional');
                    }
                    if (condition.type === 'equal' || condition.type === 'not_equal') {
                        if (!condition.value) {
                            validator.addError('Option "condition.value" is not set');
                        } else {
                            validator.parsFormulaVariables(condition.value);
                        }
                    }

                    if (!condition.tag) {
                        validator.addError(`Option "tag" is not set`);
                    }

                    if (tagMap[condition.tag]) {
                        validator.addError(`Condition Tag ${condition.tag} already exist`);
                    }

                    tagMap[condition.tag] = true;
                }
            } else {
                validator.addError('Option "conditions" must be an array');
            }

        } catch (error) {
            validator.addError(`Unhandled exception ${validator.getErrorMessage(error)}`);
        }
    }
}
