import { Message } from './message.js';
import { IURL } from './url.interface.js';
import { MessageAction } from './message-action.js';
import { MessageType } from './message-type.js';
import { ContractMessageBody } from './message-body.interface.js';
import { ContractType } from '@guardian/interfaces';
import { Contract } from '../../entity/index.js';

/**
 * Contract message
 */
export class ContractMessage extends Message {
    /**
     * Contract id
     */
    public contractId: string;

    /**
     * Contract description
     */
    public description: string;

    /**
     * Contract type
     */
    public contractType: ContractType;

    /**
     * Owner
     */
    public owner: string;

    /**
     * Version
     */
    public version: string;

    constructor(action: MessageAction) {
        super(action, MessageType.Contract);
    }

    /**
     * Set document
     * @param token
     */
    public setDocument(contract: Contract): void {
        this.contractId = contract.contractId;
        this.description = contract.description;
        this.contractType = contract.type;
        this.owner = contract.owner;
        this.version = contract.version;
    }

    /**
     * To message object
     */
    public override toMessageObject(): ContractMessageBody {
        return {
            id: null,
            status: null,
            type: this.type,
            action: this.action,
            lang: this.lang,
            account: this.account,
            contractId: this.contractId,
            description: this.description,
            contractType: this.contractType,
            owner: this.owner,
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
     * @param documents
     */
    public loadDocuments(documents: string[]): ContractMessage {
        return this;
    }

    /**
     * From message
     * @param message
     */
    public static fromMessage(message: string): ContractMessage {
        if (!message) {
            throw new Error('Message Object is empty');
        }

        const json = JSON.parse(message);
        return ContractMessage.fromMessageObject(json);
    }

    /**
     * From message object
     * @param json
     */
    public static fromMessageObject(json: ContractMessageBody): ContractMessage {
        if (!json) {
            throw new Error('JSON Object is empty');
        }

        if (json.type !== MessageType.Contract) {
            throw new Error('Invalid message type');
        }

        let message = new ContractMessage(json.action);
        message = Message._fromMessageObject(message, json);
        message._id = json.id;
        message._status = json.status;

        message.contractId = json.contractId;
        message.description = json.description;
        message.contractType = json.contractType;
        message.owner = json.owner;
        message.version = json.version || '1.0.0';

        const urls = []
        message.setUrls(urls);
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
        result.contractId = this.contractId;
        result.description = this.description;
        result.contractType = this.contractType;
        result.owner = this.owner;
        result.version = this.version;
        return result;
    }

    public static fromJson(json: any): ContractMessage {
        if (!json) {
            throw new Error('JSON Object is empty');
        }

        const result = Message._fromJson(new ContractMessage(json.action), json);
        result.contractId = json.contractId;
        result.description = json.description;
        result.contractType = json.contractType;
        result.owner = json.owner;
        result.version = json.version;
        return result;
    }

    /**
     * Get User DID
     */
    public override getOwner(): string {
        return this.owner;
    }
}
