import { VcDocument } from './../vcjs/vc-document';
import { Message } from './message';
import { IURL } from "./i-url";
import { MessageAction } from "./message-action";
import { MessageType } from "./message-type";

export class VCMessage extends Message {
    public vcDocument: VcDocument;
    public document: any;
    public hash: string;

    constructor(action: MessageAction) {
        super(action, MessageType.VCDocument);
    }

    public setDocument(document: VcDocument): void {
        this.vcDocument = document;
        this.document = document.getDocument();
        this.hash = document.toCredentialHash();
    }

    public getDocument(): any {
        return this.document;
    }

    public toMessage(): string {
        return JSON.stringify({
            action: this.action,
            type: this.type,
            cid: this.urls[0].cid,
            url: this.urls[0].url
        });
    }

    public async toDocuments(): Promise<ArrayBuffer[]> {
        const json = JSON.stringify(this.document);
        const buffer = Buffer.from(json);
        return [buffer];
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

    public override getUrl(): IURL {
        return this.urls[0];
    }
}
