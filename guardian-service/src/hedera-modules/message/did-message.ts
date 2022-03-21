import { DIDDocument } from 'hedera-modules';
import { Message, MessageType } from './message';


export class DIDMessage extends Message {
    public document: any;
    public didDocument: DIDDocument;
    public did: string;

    constructor(action: string) {
        super(action, MessageType.DIDDocument);
    }

    public setDocument(document: DIDDocument): void {
        this.didDocument = document;
        this.document = document.getDocument();
        this.did = document.getDid();
    }

    public toMessage(): string {
        return JSON.stringify({
            action: this.action,
            type: this.type,
            cid: this.urls[0].cid,
            url: this.urls[0].url
        });
    }

    public toDocuments(): string[] {
        return [JSON.stringify(this.document)];
    }

    public loadDocuments(documents: string[]): DIDMessage {
        this.document = JSON.parse(documents[0]);
        return this;
    }

    public static fromMessage(message: string): DIDMessage {
        const json = JSON.parse(message);
        return this.fromMessageObject(json);
    }

    public static fromMessageObject(json: any): DIDMessage {
        const message = new DIDMessage(json.action);
        const urls = [{
            cid: json.cid,
            url: json.url
        }]
        message.setUrls(urls);
        return message;
    }
}
