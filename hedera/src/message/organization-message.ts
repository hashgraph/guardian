import { Message } from './message.js';
import { IURL } from './url.interface.js';
import { MessageAction } from './message-action.js';
import { MessageType } from './message-type.js';
import { OrganizationMessageBody } from './message-body.interface.js';

/**
 * Organization message
 *
 * Published to the SR / global topic when a Standard Registry creates an Organization.
 * Carries the org DID, org topic id, name, and a snapshot of the OrgRole definitions for
 * on-ledger traceability.
 */
export class OrganizationMessage extends Message {
    /**
     * Organization DID
     */
    public did: string;
    /**
     * Organization Hedera topic id
     */
    public organizationTopicId: string;
    /**
     * Organization name
     */
    public name: string;
    /**
     * OrgRole definitions
     */
    public roles: { name: string; permissions: string[] }[];
    /**
     * Attributes
     */
    public attributes: { [x: string]: string } | undefined;

    constructor(action: MessageAction) {
        super(action, MessageType.Organization);
    }

    /**
     * Set document
     */
    public setDocument(
        did: string,
        topicId: string,
        name: string,
        roles: { name: string; permissions: string[] }[],
        attributes?: { [x: string]: string }
    ): void {
        this.did = did;
        this.organizationTopicId = topicId;
        this.name = name;
        this.roles = roles || [];
        this.lang = 'en-US';
        this.attributes = attributes || {};
    }

    /**
     * To message object
     */
    public override toMessageObject(): OrganizationMessageBody {
        return {
            id: this._id,
            status: null,
            type: this.type,
            action: this.action,
            lang: this.lang,
            account: this.account,
            did: this.did,
            topicId: this.organizationTopicId,
            name: this.name,
            roles: this.roles,
            attributes: this.attributes
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
    public loadDocuments(_documents: string[]): OrganizationMessage {
        return this;
    }

    /**
     * From message
     */
    public static fromMessage(message: string): OrganizationMessage {
        if (!message) {
            throw new Error('Message Object is empty');
        }
        const json = JSON.parse(message);
        return OrganizationMessage.fromMessageObject(json);
    }

    /**
     * From message object
     */
    public static fromMessageObject(json: OrganizationMessageBody): OrganizationMessage {
        if (!json) {
            throw new Error('JSON Object is empty');
        }
        if (json.type !== MessageType.Organization) {
            throw new Error('Invalid message type');
        }
        let message = new OrganizationMessage(json.action);
        message = Message._fromMessageObject(message, json);
        message._id = json.id;
        message._status = json.status;
        message.did = json.did;
        message.organizationTopicId = json.topicId;
        message.name = json.name;
        message.roles = Array.isArray(json.roles) ? json.roles : [];
        message.lang = json.lang;
        message.account = json.account;
        message.attributes = json.attributes || {};
        return message;
    }

    /**
     * Validate
     */
    public override validate(): boolean {
        return true;
    }

    /**
     * Get URLs
     */
    public getUrls(): IURL[] {
        return [];
    }

    /**
     * To JSON
     */
    public override toJson(): any {
        const result = super.toJson();
        result.did = this.did;
        result.organizationTopicId = this.organizationTopicId;
        result.name = this.name;
        result.roles = this.roles;
        result.attributes = this.attributes;
        return result;
    }

    /**
     * From JSON
     */
    public static fromJson(json: any): OrganizationMessage {
        if (!json) {
            throw new Error('JSON Object is empty');
        }
        const result = Message._fromJson(new OrganizationMessage(json.action), json);
        result.did = json.did;
        result.organizationTopicId = json.organizationTopicId;
        result.name = json.name;
        result.roles = Array.isArray(json.roles) ? json.roles : [];
        result.attributes = json.attributes;
        return result;
    }

    /**
     * Get owner DID (the org's own DID)
     */
    public override getOwner(): string {
        return this.did;
    }
}
