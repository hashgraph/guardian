import { BlockValidator, IBlockProp } from '@policy-engine/block-validators';

/**
 * Revoke document action with UI
 */
export class RevocationBlock {
    /**
     * Block type
     */
    public static readonly blockType: string = 'revocationBlock';

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
            if (ref.options.updatePrevDoc && !ref.options.prevDocStatus) {
                validator.addError('Option "Status Value" is not set');
            }
        } catch (error) {
            validator.addError(
                `Unhandled exception ${validator.getErrorMessage(error)}`
            );
        }
    }
}
