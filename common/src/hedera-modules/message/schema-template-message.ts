import { SchemaTemplate } from '../../entity/index.js';
import { Message } from './message.js';
import { MessageAction } from './message-action.js';
import { SchemaTemplateMessageBody } from './message-body.interface.js';
import { MessageType } from './message-type.js';

/**
 * Schema template message
 */
export class SchemaTemplateMessage extends Message {
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
    /**
     * Owner
     */
    public owner: string;
    /**
     * Schema template topic ID
     */
    public schemaTemplateTopicId: string;
    /**
     * Version
     */
    public version: string;

    constructor(type: MessageType.SchemaTemplate, action: MessageAction) {
        super(action, type);
        this._responseType = 'raw';
    }

    /**
     * Set document
     * @param model
     */
    public setDocument(model: SchemaTemplate): void {
        this.uuid = model.uuid;
        this.name = model.name;
        this.description = model.description;
        this.owner = model.owner;
        this.schemaTemplateTopicId = model.topicId;
        this.version = model.version;
    }

    /**
     * To message object
     */
    public override toMessageObject(): SchemaTemplateMessageBody {
        return {
            id: null,
            status: null,
            type: this.type,
            action: this.action,
            lang: this.lang,
            account: this.account,
            uuid: this.uuid,
            name: this.name,
            description: this.description,
            owner: this.owner,
            topicId: this.schemaTemplateTopicId?.toString(),
            version: this.version
        };
    }

    /**
     * To documents
     */
    public async toDocuments(): Promise<Buffer[]> {
        return [];
    }

    /**
     * Load documents
     */
    public loadDocuments(): SchemaTemplateMessage {
        return this;
    }

    /**
     * From message
     * @param message
     */
    public static fromMessage(message: string): SchemaTemplateMessage {
        if (!message) {
            throw new Error('Message Object is empty');
        }

        const json = JSON.parse(message);
        return SchemaTemplateMessage.fromMessageObject(json);
    }

    /**
     * From message object
     * @param json
     */
    public static fromMessageObject(json: SchemaTemplateMessageBody): SchemaTemplateMessage {
        if (!json) {
            throw new Error('JSON Object is empty');
        }
        if (json.type !== MessageType.SchemaTemplate) {
            throw new Error('Invalid message type');
        }

        let message = new SchemaTemplateMessage(json.type, json.action);
        message = Message._fromMessageObject(message, json);
        message._id = json.id;
        message._status = json.status;
        message.uuid = json.uuid;
        message.name = json.name;
        message.description = json.description;
        message.owner = json.owner;
        message.schemaTemplateTopicId = json.topicId;
        message.version = json.version;
        return message;
    }

    /**
     * Validation
     */
    public override validate(): boolean {
        return true;
    }

    /**
     * To JSON
     */
    public override toJson(): any {
        const result = super.toJson();
        result.uuid = this.uuid;
        result.name = this.name;
        result.description = this.description;
        result.owner = this.owner;
        result.topicId = this.schemaTemplateTopicId;
        result.version = this.version;
        return result;
    }

    /**
     * From JSON
     * @param json
     */
    public static fromJson(json: any): SchemaTemplateMessage {
        if (!json) {
            throw new Error('JSON Object is empty');
        }

        const result = Message._fromJson(new SchemaTemplateMessage(json.type, json.action), json);
        result.uuid = json.uuid;
        result.name = json.name;
        result.description = json.description;
        result.owner = json.owner;
        result.schemaTemplateTopicId = json.topicId;
        result.version = json.version;
        return result;
    }
}
