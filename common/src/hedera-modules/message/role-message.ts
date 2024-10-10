import { MessageAction } from './message-action.js';
import { RoleMessageBody } from './message-body.interface.js';
import { MessageType } from './message-type.js';
import { VCMessage } from './vc-message.js';

/**
 * Role message
 */
export class RoleMessage extends VCMessage {
    /**
     * Role
     */
    public role: string;
    /**
     * Group
     */
    public group: string;

    constructor(
        action: MessageAction,
        type: MessageType = MessageType.RoleDocument
    ) {
        super(action, type);
    }

    /**
     * Set role
     * @param role
     */
    public setRole(role: {
        /**
         * role
         */
        role: string,
        /**
         * Group name
         */
        groupName: string,
    }): void {
        this.role = role.role;
        this.group = role.groupName;
    }

    /**
     * Get role
     */
    public getRole(): string {
        return this.role;
    }

    /**
     * Get group
     */
    public getGroup(): string {
        return this.group;
    }

    /**
     * To JSON
     */
    public override toJson(): any {
        const result = super.toJson();
        result.role = this.role;
        result.group = this.group;
        return result;
    }

    /**
     * To message object
     */
    public override toMessageObject(): RoleMessageBody {
        const result: RoleMessageBody = super.toMessageObject() as RoleMessageBody;
        if (this.role) {
            result.role = this.role;
        }
        if (this.group) {
            result.group = this.group;
        }
        return result;
    }

    /**
     * From message object
     * @param json
     */
    public static fromMessageObject(json: RoleMessageBody): RoleMessage {
        if (!json) {
            throw new Error('JSON Object is empty');
        }

        let message = new RoleMessage(json.action, json.type);
        message = VCMessage._fromMessageObject(message, json);
        message.role = json.role;
        message.group = json.group;
        return message;
    }

    /**
     * Support for old messages
     */
    protected override changeType(): void {
        return;
    }
}
