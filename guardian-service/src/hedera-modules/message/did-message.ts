import { DIDDocument } from './../vcjs/did-document';
import { Message } from './message';
import { IURL } from "./i-url";
import { MessageAction } from "./message-action";
import { MessageType } from "./message-type";


export class DIDMessage extends Message {
    public document: any;
    public didDocument: DIDDocument;
    public did: string;

    constructor(action: MessageAction) {
        super(action, MessageType.DIDDocument);
    }

    public setDocument(document: DIDDocument): void {
        this.didDocument = document;
        this.document = document.getDocument();
        this.did = document.getDid();
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
        const documentFile = new Blob([json], { type: "application/json" });
        const buffer = await documentFile.arrayBuffer();
        return [buffer];
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

    public override getUrl(): IURL {
        return this.urls[0];
    }
}
