import { MessageAction } from './message-action.js';
import { UserPermissionsMessageBody } from './message-body.interface.js';
import { MessageType } from './message-type.js';
import { VCMessage } from './vc-message.js';

/**
 * Role message
 */
export class UserPermissionsMessage extends VCMessage {
    /**
     * User DID
     */
    public user: string;

    constructor(
        action: MessageAction,
        type: MessageType = MessageType.UserPermissions
    ) {
        super(action, type);
    }

    /**
     * Set role
     * @param role
     */
    public setRole(role: {
        user: string
    }): void {
        this.user = role.user;
    }

    /**
     * To JSON
     */
    public override toJson(): any {
        const result = super.toJson();
        result.user = this.user;
        return result;
    }

    /**
     * To message object
     */
    public override toMessageObject(): UserPermissionsMessageBody {
        const result: UserPermissionsMessageBody = super.toMessageObject() as UserPermissionsMessageBody;
        if (this.user) {
            result.user = this.user;
        }
        return result;
    }

    /**
     * From message object
     * @param json
     */
    public static fromMessageObject(json: UserPermissionsMessageBody): UserPermissionsMessage {
        if (!json) {
            throw new Error('JSON Object is empty');
        }

        let message = new UserPermissionsMessage(json.action, json.type);
        message = VCMessage._fromMessageObject(message, json);
        message.user = json.user;
        return message;
    }

    /**
     * Support for old messages
     */
    protected override changeType(): void {
        return;
    }
}
