import { BlockValidator, IBlockProp } from '@policy-engine/block-validators';

/**
 * Send to guardian
 */
export class SendToGuardianBlock {
    public static readonly blockType: string = 'sendToGuardianBlock';

    /**
     * Validate block options
     * @param validator
     * @param config
     */
    public static async validate(validator: BlockValidator, ref: IBlockProp): Promise<void> {
        try {
            if (ref.options.dataType) {
                const t = ['vc-documents', 'did-documents', 'approve', 'hedera'];
                if (t.indexOf(ref.options.dataType) === -1) {
                    validator.addError(`Option "dataType" must be one of ${t.join('|')}`);
                }
            } else if (ref.options.dataSource === 'auto') {
                return;
            } else if (ref.options.dataSource === 'database') {
                return;
            } else if (ref.options.dataSource === 'hedera') {
                if (ref.options.topic && ref.options.topic !== 'root') {
                    if (validator.topicTemplateNotExist(ref.options.topic)) {
                        validator.addError(`Topic "${ref.options.topic}" does not exist`);
                    }
                }
            } else if (!ref.options.dataSource) {
                return;
            } else {
                validator.addError('Option "dataSource" must be one of auto|database|hedera');
            }
        } catch (error) {
            validator.addError(`Unhandled exception ${validator.getErrorMessage(error)}`);
        }
    }
}