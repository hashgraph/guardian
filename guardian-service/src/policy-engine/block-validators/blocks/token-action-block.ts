import { BlockValidator, IBlockProp } from '@policy-engine/block-validators';

/**
 * Information block
 */
export class TokenActionBlock {
    /**
     * Block type
     */
    public static readonly blockType: string = 'tokenActionBlock';

    /**
     * Validate block options
     * @param validator
     * @param config
     */
    public static async validate(validator: BlockValidator, ref: IBlockProp): Promise<void> {
        try {
            const accountType = ['default', 'custom'];
            if (accountType.indexOf(ref.options.accountType) === -1) {
                validator.addError('Option "accountType" must be one of ' + accountType.join(','));
            }
            const types = ref.options.accountType === 'default' ? [
                'associate',
                'dissociate',
                'freeze',
                'unfreeze',
                'grantKyc',
                'revokeKyc',
            ] : [
                'freeze',
                'unfreeze',
                'grantKyc',
                'revokeKyc',
            ];
            if (types.indexOf(ref.options.action) === -1) {
                validator.addError('Option "action" must be one of ' + types.join(','));
            }
            if (ref.options.useTemplate) {
                if (!ref.options.template) {
                    validator.addError('Option "template" does not set');
                }
                if (validator.tokenTemplateNotExist(ref.options.template)) {
                    validator.addError(`Token "${ref.options.template}" does not exist`);
                }
            } else {
                if (!ref.options.tokenId) {
                    validator.addError('Option "tokenId" does not set');
                } else if (typeof ref.options.tokenId !== 'string') {
                    validator.addError('Option "tokenId" must be a string');
                } else if (await validator.tokenNotExist(ref.options.tokenId)) {
                    validator.addError(`Token with id ${ref.options.tokenId} does not exist`);
                }
            }
            if (ref.options.accountType === 'custom' && !ref.options.accountId) {
                validator.addError('Option "accountId" does not set');
            }
        } catch (error) {
            validator.addError(`Unhandled exception ${validator.getErrorMessage(error)}`);
        }
    }
}
