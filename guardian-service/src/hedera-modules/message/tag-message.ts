import { Message } from './message';
import { IURL } from './url.interface';
import { MessageAction } from './message-action';
import { MessageType } from './message-type';
import { TagMessageBody } from './message-body.interface';
import { Tag } from '@entity/tag';

/**
 * Tag message
 */
export class TagMessage extends Message {
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
     * Target
     */
    public target: string;
    /**
     * Operation
     */
    public operation: 'Create' | 'Delete';
    /**
     * Entity
     */
    public entity: string;

    constructor(action: MessageAction) {
        super(action, MessageType.Tag);
        this._responseType = 'raw';
        this.setUrls([]);
    }

    /**
     * Set document
     * @param tag
     * @param zip
     */
    public setDocument(tag: Tag): void {
        this.uuid = tag.uuid;
        this.name = tag.name;
        this.description = tag.description;
        this.owner = tag.owner;
        this.target = tag.target;
        this.operation = tag.operation;
        this.entity = tag.entity;
    }

    /**
     * To message object
     */
    public override toMessageObject(): TagMessageBody {
        return {
            id: null,
            status: null,
            type: this.type,
            action: this.action,
            lang: this.lang,
            uuid: this.uuid,
            name: this.name,
            description: this.description,
            owner: this.owner,
            target: this.target,
            operation: this.operation,
            entity: this.entity
        }
    }

    /**
     * To documents
     */
    public async toDocuments(): Promise<ArrayBuffer[]> {
        return [];
    }

    /**
     * Load documents
     * @param documents
     */
    public loadDocuments(documents: string[]): TagMessage {
        return this;
    }

    /**
     * From message
     * @param message
     */
    public static fromMessage(message: string): TagMessage {
        if (!message) {
            throw new Error('Message Object is empty');
        }

        const json = JSON.parse(message);
        return TagMessage.fromMessageObject(json);
    }

    /**
     * From message object
     * @param json
     */
    public static fromMessageObject(json: TagMessageBody): TagMessage {
        if (!json) {
            throw new Error('JSON Object is empty');
        }

        if (json.type !== MessageType.Tag) {
            throw new Error('Invalid message type')
        }

        let message = new TagMessage(json.action);
        message = Message._fromMessageObject(message, json);
        message._id = json.id;
        message._status = json.status;
        message.uuid = json.uuid;
        message.name = json.name;
        message.description = json.description;
        message.owner = json.owner;
        message.target = json.target;
        message.operation = json.operation;
        message.entity = json.entity;
        return message;
    }

    /**
     * Get URLs
     */
    public getUrls(): IURL[] {
        return [];
    }

    /**
     * Validation
     */
    public override validate(): boolean {
        return true;
    }
}
