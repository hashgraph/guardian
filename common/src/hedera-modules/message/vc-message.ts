import { VcDocument } from './../vcjs/vc-document.js';
import { Message } from './message.js';
import { IURL, UrlType } from './url.interface.js';
import { MessageAction } from './message-action.js';
import { MessageType } from './message-type.js';
import { VcMessageBody } from './message-body.interface.js';
import { Hashing } from '../hashing.js';
import { SignatureType } from '@guardian/interfaces';
import {
    bytesToUtf8,
    CipherStrategy,
    decryptWithKeyDerivedFromString,
    encryptWithKeyDerivedFromString,
    utf8ToBytes,
} from '@meeco/cryppo';
import { SerializationFormat } from '@meeco/cryppo/dist/src/serialization-versions.js';
import { IPFS } from '../../helpers/index.js';

/**
 * VC message
 */
export class VCMessage extends Message {
    /**
     * VC document
     */
    public vcDocument: VcDocument;
    /**
     * Document
     */
    public document: any;
    /**
     * Hash
     */
    public hash: string;
    /**
     * Issuer
     */
    public issuer: string;
    /**
     * Relationships
     */
    public relationships: string[];
    /**
     * Document status
     */
    public documentStatus: string;
    /**
     * User Role
     */
    public userMessageId: string;
    /**
     * Encoded Data
     */
    public encodedData: boolean;
    /**
     * Guardian Version
     */
    public guardianVersion: string;
    /**
     * Tag
     */
    public tag: string;
    /**
     * Start Message
     */
    public startMessage: string;
    /**
     * Entity Type
     */
    public entityType: string;
    /**
     * Option
     */
    public option: any;

    constructor(
        action: MessageAction,
        type: MessageType = MessageType.VCDocument
    ) {
        super(action, type);
    }

    /**
     * Set Document status
     * @param status
     */
    public setDocumentStatus(status: string): void {
        this.documentStatus = status;
    }

    /**
     * Set document
     * @param document
     */
    public setDocument(document: VcDocument): void {
        const proof = document.getProof();
        this.vcDocument = document;
        this.document = document.getDocument();
        this.hash = document.toCredentialHash();
        this.issuer = document.getIssuerDid();
        if (proof.type === SignatureType.BbsBlsSignature2020) {
            this.encodedData = true;
        } else {
            this.encodedData = false;
        }
        if (Array.isArray(this.document.credentialSubject)) {
            this.guardianVersion = this.document.credentialSubject[0].guardianVersion;
        } else {
            this.guardianVersion = this.document.credentialSubject.guardianVersion;
        }
        this.changeType();
    }

    /**
     * Support for old messages
     */
    protected changeType(): void {
        if (this.encodedData) {
            this.type = MessageType.EVCDocument;
        } else {
            this.type = MessageType.VCDocument;
        }
    }

    /**
     * Set relationships
     * @param ids
     */
    public setRelationships(ids: string[]): void {
        this.relationships = ids;
        if (this.userMessageId) {
            if (this.relationships) {
                if (this.relationships.indexOf(this.userMessageId) === -1) {
                    this.relationships.push(this.userMessageId);
                }
            } else {
                this.relationships = [this.userMessageId];
            }
        }
    }

    /**
     * Set relationships
     * @param messageId
     */
    public setUser(messageId: string): void {
        this.userMessageId = messageId;
        if (this.userMessageId) {
            if (this.relationships) {
                if (this.relationships.indexOf(this.userMessageId) === -1) {
                    this.relationships.push(this.userMessageId);
                }
            } else {
                this.relationships = [this.userMessageId];
            }
        }
    }

    /**
     * Set tag
     * @param ids
     */
    public setTag(document: any): void {
        this.tag = document?.tag;
    }

    /**
     * Set entity type
     * @param ids
     */
    public setEntityType(document: any): void {
        if (document?.options?.entityType) {
            this.entityType = document.options.entityType;
        }
    }

    /**
     * Set option
     * @param ids
     */
    public setOption(document: any, ref?: any): void {
        this.option = {};
        if (document?.option) {
            this.option = document?.option;
        } else if (ref?.options?.options) {
            for (const option of ref.options.options) {
                this.option[option.name] = option.value;
            }
        }
    }

    /**
     * Set parent message
     * @param messageId
     */
    public setRef(messageId: string): void {
        this.startMessage = messageId;
    }

    /**
     * Get documents
     */
    public getDocument(): any {
        return this.document;
    }

    /**
     * To message object
     */
    public override toMessageObject(): VcMessageBody {
        return {
            id: null,
            status: null,
            type: this.type,
            action: this.action,
            lang: this.lang,
            account: this.account,
            issuer: this.issuer,
            relationships: this.relationships,
            encodedData: this.encodedData,
            documentStatus: this.documentStatus,
            guardianVersion: this.guardianVersion,
            tag: this.tag,
            startMessage: this.startMessage,
            entityType: this.entityType,
            option: this.option,
            cid: this.getDocumentUrl(UrlType.cid),
            uri: this.getDocumentUrl(UrlType.url),
        };
    }

    /**
     * To documents
     */
    public async toDocuments(key: string): Promise<Buffer[]> {
        let document = JSON.stringify(this.document);
        if (this.encodedData || this.type === MessageType.EVCDocument) {
            if (!key) {
                throw new Error(
                    'There is no appropriate private key to encode VC data'
                );
            }
            const encryptedDocument = await encryptWithKeyDerivedFromString({
                passphrase: key,
                data: utf8ToBytes(document),
                strategy: CipherStrategy.AES_GCM,
                serializationVersion: SerializationFormat.latest_version,
            });
            document = encryptedDocument.serialized;
        }
        const buffer = Buffer.from(document) as any;
        return [buffer];
    }

    /**
     * Load documents
     * @param documents
     */
    public async loadDocuments(
        documents: string[],
        key: string
    ): Promise<VCMessage> {
        if (this.encodedData || this.type === MessageType.EVCDocument) {
            const decrypted = await decryptWithKeyDerivedFromString({
                serialized: documents[0],
                passphrase: key,
            });
            this.document = bytesToUtf8(decrypted);
            return this;
        }
        this.document = JSON.parse(documents[0]);
        return this;
    }

    /**
     * From message
     * @param message
     */
    public static fromMessage(message: string): VCMessage {
        if (!message) {
            throw new Error('Message Object is empty');
        }

        const json = JSON.parse(message);
        return VCMessage.fromMessageObject(json);
    }

    /**
     * From message object
     * @param json
     */
    public static fromMessageObject(json: VcMessageBody): VCMessage {
        if (!json) {
            throw new Error('JSON Object is empty');
        }

        let message = new VCMessage(json.action, json.type);
        message = VCMessage._fromMessageObject(message, json);
        return message;
    }

    /**
     * From message object
     * @param message
     * @param json
     */
    protected static override _fromMessageObject<T extends Message>(message: T, json: VcMessageBody): T {
        const _message: VCMessage = super._fromMessageObject(message, json) as any;
        _message._id = json.id;
        _message._status = json.status;
        _message.issuer = json.issuer;
        _message.relationships = json.relationships;
        _message.documentStatus = json.documentStatus;
        _message.encodedData = json.encodedData || json.type === MessageType.EVCDocument;
        _message.guardianVersion = json.guardianVersion;
        _message.tag = json.tag;
        _message.startMessage = json.startMessage;
        _message.entityType = json.entityType;
        _message.option = json.option;
        const urls = [
            {
                cid: json.cid,
                url: IPFS.IPFS_PROTOCOL + json.cid,
            },
        ];
        _message.setUrls(urls);
        return _message as any;
    }

    /**
     * Get URL
     */
    public override getUrl(): IURL {
        return this.getUrls()[0];
    }

    /**
     * Validate
     */
    public override validate(): boolean {
        return true;
    }

    /**
     * Get document URL
     * @param type
     */
    public getDocumentUrl(type: UrlType): string | null {
        return this.getUrlValue(0, type);
    }

    /**
     * To hash
     */
    public override toHash(): string {
        const map: any = {
            status: this._status,
            type: this.type,
            action: this.action,
            lang: this.lang,
            issuer: this.issuer,
            relationships: this.relationships,
            hash: this.hash,
            encodedData: this.encodedData,
            guardianVersion: this.guardianVersion,
            tag: this.tag,
            startMessage: this.startMessage,
            entityType: this.entityType,
            option: this.option,
        }
        const json: string = JSON.stringify(map);
        const hash: Uint8Array = Hashing.sha256.digest(json);
        return Hashing.base58.encode(hash);
    }

    /**
     * Relationship message
     */
    public getRelationships(): string[] {
        return this.relationships || [];
    }

    /**
     * To JSON
     */
    public override toJson(): any {
        const result = super.toJson();
        result.issuer = this.issuer;
        result.hash = this.hash;
        result.relationships = this.relationships;
        result.document = this.document;
        result.documentStatus = this.documentStatus;
        result.encodedData = this.encodedData;
        result.guardianVersion = this.guardianVersion;
        result.tag = this.tag;
        result.startMessage = this.startMessage;
        result.entityType = this.entityType;
        result.option = this.option;
        return result;
    }

    public static fromJson(json: any): VCMessage {
        if (!json) {
            throw new Error('JSON Object is empty');
        }

        const result = Message._fromJson(new VCMessage(json.action), json);
        result.issuer = json.issuer;
        result.hash = json.hash;
        result.relationships = json.relationships;
        result.document = json.document;
        result.documentStatus = json.documentStatus;
        result.encodedData = json.encodedData;
        result.guardianVersion = json.guardianVersion;
        result.tag = json.tag;
        result.startMessage = json.startMessage;
        result.entityType = json.entityType;
        result.option = json.option;
        return result;
    }

    /**
     * Get User DID
     */
    public override getOwner(): string {
        return this.issuer;
    }
}
