import { VcDocument } from './../vcjs/vc-document';
import { Message } from './message';
import { IURL, UrlType } from './url.interface';
import { MessageAction } from './message-action';
import { MessageType } from './message-type';
import { VcMessageBody } from './message-body.interface';
import { Hashing } from '../hashing';
import { SignatureType } from '@guardian/interfaces';
import {
    bytesToUtf8,
    CipherStrategy,
    decryptWithKeyDerivedFromString,
    encryptWithKeyDerivedFromString,
    utf8ToBytes,
} from '@meeco/cryppo';
import { SerializationFormat } from '@meeco/cryppo/dist/src/serialization-versions';
import { IPFS } from '../../helpers';

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
        this.vcDocument = document;
        this.document = document.getDocument();
        this.hash = document.toCredentialHash();
        this.issuer = document.getIssuerDid();
        const proof = document.getProof();
        switch (proof.type) {
            case SignatureType.BbsBlsSignature2020:
                this.type = MessageType.EVCDocument;
                break;
            default:
                this.type = MessageType.VCDocument;
                break;
        }
    }

    /**
     * Set relationships
     * @param ids
     */
    public setRelationships(ids: string[]): void {
        this.relationships = ids;
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
            issuer: this.issuer,
            relationships: this.relationships,
            cid: this.getDocumentUrl(UrlType.cid),
            uri: this.getDocumentUrl(UrlType.url),
            documentStatus: this.documentStatus,
        };
    }

    /**
     * To documents
     */
    public async toDocuments(key: string): Promise<ArrayBuffer[]> {
        let document = JSON.stringify(this.document);
        if (this.type === MessageType.EVCDocument) {
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
        const buffer = Buffer.from(document);
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
        if (this.type === MessageType.EVCDocument) {
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
        message = Message._fromMessageObject(message, json);
        message._id = json.id;
        message._status = json.status;
        message.issuer = json.issuer;
        message.relationships = json.relationships;
        const urls = [
            {
                cid: json.cid,
                url: IPFS.IPFS_PROTOCOL + json.cid,
            },
        ];
        message.setUrls(urls);
        return message;
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
        const map:any = {
            status: this._status,
            type: this.type,
            action: this.action,
            lang: this.lang,
            issuer: this.issuer,
            relationships: this.relationships,
            hash: this.hash
        }
        const json: string = JSON.stringify(map);
        const hash: Uint8Array = Hashing.sha256.digest(json);
        return Hashing.base58.encode(hash);
    }
}
