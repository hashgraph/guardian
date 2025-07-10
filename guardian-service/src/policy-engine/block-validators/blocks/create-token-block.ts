import { TokenType } from '@guardian/interfaces';
import { BlockValidator, IBlockProp } from '../../block-validators/index.js';
import { CommonBlock } from './common.js';

/**
 * Create Token block
 */
export class CreateTokenBlock {
    /**
     * Block type
     */
    public static readonly blockType: string = 'createTokenBlock';

    /**
     * Is empty value
     * @param value Value
     * @returns Result
     */
    private static _isEmpty(value: string) {
        return value === null || value === undefined;
    }

    /**
     * Validate block options
     * @param validator
     * @param config
     */
    public static async validate(
        validator: BlockValidator,
        ref: IBlockProp
    ): Promise<void> {
        try {
            await CommonBlock.validate(validator, ref);
            if (!ref.options.template) {
                validator.addError('Template can not be empty');
            }
            if (ref.options.autorun && ref.options.defaultActive) {
                validator.addError(`Autorun can't be use with default active`);
            }
            const tokenTemplate = validator.getTokenTemplate(
                ref.options.template
            );
            if (!tokenTemplate) {
                validator.addError(
                    `Token "${ref.options.template}" does not exist`
                );
                return;
            }
            if (ref.options.autorun) {
                if (CreateTokenBlock._isEmpty(tokenTemplate.tokenType)) {
                    validator.addError(`Autorun requires all fields to be filled in token template`);
                }
                if (tokenTemplate.tokenType === TokenType.FUNGIBLE) {
                    if (CreateTokenBlock._isEmpty(tokenTemplate.decimals)) {
                        validator.addError(`Autorun requires all fields to be filled in token template`);
                    }
                }
                if (CreateTokenBlock._isEmpty(tokenTemplate.tokenName)) {
                    validator.addError(`Autorun requires all fields to be filled in token template`);
                }
                if (CreateTokenBlock._isEmpty(tokenTemplate.tokenSymbol)) {
                    validator.addError(`Autorun requires all fields to be filled in token template`);
                }
                if (CreateTokenBlock._isEmpty(tokenTemplate.enableAdmin)) {
                    validator.addError(`Autorun requires all fields to be filled in token template`);
                }
                if (CreateTokenBlock._isEmpty(tokenTemplate.enableWipe)) {
                    validator.addError(`Autorun requires all fields to be filled in token template`);
                }
                if (CreateTokenBlock._isEmpty(tokenTemplate.enableKYC)) {
                    validator.addError(`Autorun requires all fields to be filled in token template`);
                }
                if (CreateTokenBlock._isEmpty(tokenTemplate.enableFreeze)) {
                    validator.addError(`Autorun requires all fields to be filled in token template`);
                }
                if (tokenTemplate.enableWipe) {
                    if (tokenTemplate.wipeContractId !== '' && CreateTokenBlock._isEmpty(tokenTemplate.wipeContractId)) {
                        validator.addError(`Autorun requires all fields to be filled in token template`);
                    }
                }
            }
        } catch (error) {
            validator.addError(
                `Unhandled exception ${validator.getErrorMessage(error)}`
            );
        }
    }
}
