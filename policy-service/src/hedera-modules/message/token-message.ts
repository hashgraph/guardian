import { Message } from './message';
import { IURL } from './url.interface';
import { MessageAction } from './message-action';
import { MessageType } from './message-type';
import { TokenMessageBody } from './message-body.interface';

/**
 * Token message
 */
export class TokenMessage extends Message {
    /**
     * Token id
     */
    public tokenId: string;

    /**
     * Token name
     */
    public tokenName: string;

    /**
     * Token symbol
     */
    public tokenSymbol: string;

    /**
     * Token type
     */
    public tokenType: string;

    /**
     * Token decimals
     */
    public decimals: string;

    /**
     * Owner
     */
    public owner: string;

    constructor(action: MessageAction) {
        super(action, MessageType.Token);
    }

    /**
     * Set document
     * @param token
     */
    public setDocument(token: {
        /**
         * Token id
         */
        tokenId?: string,

        /**
         * Token name
         */
        tokenName?: string,

        /**
         * Token symbol
         */
        tokenSymbol?: string,

        /**
         * Token type
         */
        tokenType?: string,

        /**
         * Token decimals
         */
        decimals?: string,

        /**
         * Owner
         */
        owner?: string,
    }): void {
        this.tokenId = token.tokenId;
        this.tokenName = token.tokenName;
        this.tokenSymbol = token.tokenSymbol;
        this.tokenType = token.tokenType;
        this.decimals = token.decimals;
        this.owner = token.owner;
    }

    /**
     * To message object
     */
    public override toMessageObject(): TokenMessageBody {
        return {
            id: null,
            status: null,
            type: this.type,
            action: this.action,
            lang: this.lang,
            tokenId: this.tokenId,
            tokenName: this.tokenName,
            tokenSymbol: this.tokenSymbol,
            tokenType: this.tokenType,
            decimals: this.decimals,
            owner: this.owner
        };
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
    public loadDocuments(documents: string[]): TokenMessage {
        return this;
    }

    /**
     * From message
     * @param message
     */
    public static fromMessage(message: string): TokenMessage {
        if (!message) {
            throw new Error('Message Object is empty');
        }

        const json = JSON.parse(message);
        return TokenMessage.fromMessageObject(json);
    }

    /**
     * From message object
     * @param json
     */
    public static fromMessageObject(json: TokenMessageBody): TokenMessage {
        if (!json) {
            throw new Error('JSON Object is empty');
        }

        if (json.type !== MessageType.Token) {
            throw new Error('Invalid message type');
        }

        let message = new TokenMessage(json.action);
        message = Message._fromMessageObject(message, json);
        message._id = json.id;
        message._status = json.status;

        message.tokenId = json.tokenId;
        message.tokenName = json.tokenName;
        message.tokenSymbol = json.tokenSymbol;
        message.tokenType = json.tokenType;
        message.decimals = json.decimals;
        message.owner = json.owner;

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
}
