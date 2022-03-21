import { VcDocument } from 'hedera-modules';
import { Message, MessageType } from './message';

export class VCMessage extends Message {
    public vcDocument: VcDocument;
    public document: any;
    public hash: string;

    constructor(action: string) {
        super(action, MessageType.VCDocument);
    }

    public setDocument(document: VcDocument): void {
        this.vcDocument = document;
        this.document = document.getDocument();
        this.hash = document.toCredentialHash();
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

    public loadDocuments(documents: string[]): VCMessage {
        this.document = JSON.parse(documents[0]);
        return this;
    }

    public setData(vc: any): void {
        this.document = vc;
    }

    public static fromMessage(message: string): VCMessage {
        const json = JSON.parse(message);
        return this.fromMessageObject(json);
    }

    public static fromMessageObject(json: any): VCMessage {
        const message = new VCMessage(json.action);
        const urls = [{
            cid: json.cid,
            url: json.url
        }]
        message.setUrls(urls);
        return message;
    }
}
