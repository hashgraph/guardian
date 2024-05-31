import { MessageAction } from './message-action.js';
import { GuardianRoleMessageBody } from './message-body.interface.js';
import { MessageType } from './message-type.js';
import { VCMessage } from './vc-message.js';

/**
 * Role message
 */
export class GuardianRoleMessage extends VCMessage {
    /**
     * UUID
     */
    public uuid: string;
    /**
     * Name
     */
    public name: string;
    /**
     * Description
     */
    public description: string;

    constructor(
        action: MessageAction,
        type: MessageType = MessageType.GuardianRole
    ) {
        super(action, type);
    }

    /**
     * Set role
     * @param role
     */
    public setRole(role: {
        uuid: string,
        name: string,
        description: string
    }): void {
        this.uuid = role.uuid;
        this.name = role.name;
        this.description = role.description;
    }

    /**
     * To JSON
     */
    public override toJson(): any {
        const result = super.toJson();
        result.uuid = this.uuid;
        result.name = this.name;
        result.description = this.description;
        return result;
    }

    /**
     * To message object
     */
    public override toMessageObject(): GuardianRoleMessageBody {
        const result: GuardianRoleMessageBody = super.toMessageObject() as GuardianRoleMessageBody;
        if (this.uuid) {
            result.uuid = this.uuid;
        }
        if (this.name) {
            result.name = this.name;
        }
        if (this.description) {
            result.description = this.description;
        }
        return result;
    }

    /**
     * From message object
     * @param json
     */
    public static fromMessageObject(json: GuardianRoleMessageBody): GuardianRoleMessage {
        if (!json) {
            throw new Error('JSON Object is empty');
        }

        let message = new GuardianRoleMessage(json.action, json.type);
        message = VCMessage._fromMessageObject(message, json);
        message.uuid = json.uuid;
        message.name = json.name;
        message.description = json.description;
        return message;
    }

    /**
     * Support for old messages
     */
    protected override changeType(): void {
        return;
    }
}
