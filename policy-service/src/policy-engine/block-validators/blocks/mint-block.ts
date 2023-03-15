import { BlockValidator, IBlockProp } from '@policy-engine/block-validators';

/**
 * Mint block
 */
export class MintBlock {
    /**
     * Block type
     */
    public static readonly blockType: string = 'mintDocumentBlock';

    /**
     * Validate block options
     * @param validator
     * @param config
     */
    public static async validate(validator: BlockValidator, ref: IBlockProp): Promise<void> {
        try {
            if (ref.options.useTemplate) {
                if (!ref.options.template) {
                    validator.addError('Option "template" is not set');
                }
                if (validator.tokenTemplateNotExist(ref.options.template)) {
                    validator.addError(`Token "${ref.options.template}" does not exist`);
                }
            } else {
                if (!ref.options.tokenId) {
                    validator.addError('Option "tokenId" is not set');
                } else if (typeof ref.options.tokenId !== 'string') {
                    validator.addError('Option "tokenId" must be a string');
                } else if (await validator.tokenNotExist(ref.options.tokenId)) {
                    validator.addError(`Token with id ${ref.options.tokenId} does not exist`);
                }
            }

            if (!ref.options.rule) {
                validator.addError('Option "rule" is not set');
            } else if (typeof ref.options.rule !== 'string') {
                validator.addError('Option "rule" must be a string');
            }

            const accountType = ['default', 'custom', 'custom-value'];
            if (accountType.indexOf(ref.options.accountType) === -1) {
                validator.addError('Option "accountType" must be one of ' + accountType.join(','));
            }
            if (ref.options.accountType === 'custom' && !ref.options.accountId) {
                validator.addError('Option "accountId" is not set');
            }
            if (ref.options.accountType === 'custom-value' && !/^\d+\.\d+\.\d+$/.test(ref.options.accountIdValue)) {
                validator.addError('Option "accountIdValue" has invalid hedera account value');
            }
        } catch (error) {
            validator.addError(`Unhandled exception ${validator.getErrorMessage(error)}`);
        }
    }
}
