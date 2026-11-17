import { BlockValidator, IBlockProp } from '../../block-validators/index.js';
import { CommonBlock } from './common.js';
import { ScriptLanguageOption } from '@guardian/interfaces';
import { isPythonSandboxDisabled, PYTHON_DISABLED_MESSAGE } from '../../helpers/workers/python-sandbox-mode.js';

/**
 * Custom logic block
 */
export class CustomLogicBlock {
    /**
     * Block type
     */
    public static readonly blockType: string = 'customLogicBlock';

    /**
     * Validate block options
     * @param validator
     * @param config
     */
    public static async validate(validator: BlockValidator, ref: IBlockProp): Promise<void> {
        try {
            await CommonBlock.validate(validator, ref);
            if (ref.options?.selectedScriptLanguage === ScriptLanguageOption.PYTHON && isPythonSandboxDisabled()) {
                validator.addPrecomputedMessagesAsText([PYTHON_DISABLED_MESSAGE], 'warning');
            }
        } catch (error) {
            validator.addError(
                `Unhandled exception ${validator.getErrorMessage(error)}`
            );
        }
    }
}
