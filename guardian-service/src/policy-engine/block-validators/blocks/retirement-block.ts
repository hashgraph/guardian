import { BlockValidator, IBlockProp } from '@policy-engine/block-validators';

/**
 * Retirement block
 */
export class RetirementBlock {
    /**
     * Block type
     */
    public static readonly blockType: string = 'retirementDocumentBlock';

    /**
     * Validate block options
     * @param validator
     * @param config
     */
    public static async validate(validator: BlockValidator, ref: IBlockProp): Promise<void> {
        try {
            if (!ref.options.tokenId) {
                validator.addError('Option "tokenId" does not set');
            } else if (typeof ref.options.tokenId !== 'string') {
                validator.addError('Option "tokenId" must be a string');
            } else if (await validator.tokenNotExist(ref.options.tokenId)) {
                validator.addError(`Token with id ${ref.options.tokenId} does not exist`);
            }

            if (!ref.options.rule) {
                validator.addError('Option "rule" does not set');
            } else if (typeof ref.options.rule !== 'string') {
                validator.addError('Option "rule" must be a string');
            }

            const accountType = ['default', 'custom'];
            if (accountType.indexOf(ref.options.accountType) === -1) {
                validator.addError('Option "accountType" must be one of ' + accountType.join(','));
            }
            if (ref.options.accountType === 'custom' && !ref.options.accountId) {
                validator.addError('Option "accountId" does not set');
            }
        } catch (error) {
            validator.addError(`Unhandled exception ${validator.getErrorMessage(error)}`);
        }
    }
}
