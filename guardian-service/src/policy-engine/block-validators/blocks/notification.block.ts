import { NotificationType, UserOption } from '@guardian/interfaces';
import { BlockValidator, IBlockProp } from '../../block-validators/index.js';
import { CommonBlock } from './common.js';

/**
 * Notification Block
 */
export class NotificationBlock {
    /**
     * Block type
     */
    public static readonly blockType: string = 'notificationBlock';

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
            if (!ref.options.title) {
                validator.addError('Option "title" is empty');
            }
            if (!ref.options.message) {
                validator.addError('Option "message" is empty');
            }
            if (!Object.values(NotificationType).includes(ref.options.type)) {
                validator.addError('Option "type" has incorrect value');
            }
            if (!Object.values(UserOption).includes(ref.options.user)) {
                validator.addError('Option "user" has incorrect value');
            }
            if (ref.options.user === UserOption.ROLE && !ref.options.role) {
                validator.addError('Option "role" is empty');
            }
        } catch (error) {
            validator.addError(
                `Unhandled exception ${validator.getErrorMessage(error)}`
            );
        }
    }
}
