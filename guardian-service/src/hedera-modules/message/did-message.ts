import { DIDDocument } from './../vcjs/did-document';
import { Message } from './message';
import { IURL } from './url.interface';
import { MessageAction } from './message-action';
import { MessageType } from './message-type';
import { DidMessageBody, MessageBody } from './message-body.interface';

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

    public override toMessageObject(): DidMessageBody {
        return {
            id: this._id,
            status: this._status,
            type: this.type,
            action: this.action,
            lang: this.lang,
            did: this.did,
            cid: this.urls[0].cid,
            url: this.urls[0].url
        };
    }

    public async toDocuments(): Promise<ArrayBuffer[]> {
        const json = JSON.stringify(this.document);
        const buffer = Buffer.from(json);
        return [buffer];
    }

    public loadDocuments(documents: string[]): DIDMessage {
        if (documents && Array.isArray(documents)) {
            this.document = JSON.parse(documents[0]);
        }
        return this;
    }

    public static fromMessage(message: string): DIDMessage {
        if (!message) {
            throw new Error('JSON Object is empty');
        }

        const json = JSON.parse(message);
        return this.fromMessageObject(json);
    }

    public static fromMessageObject(json: DidMessageBody): DIDMessage {
        if (!json) {
            throw new Error('JSON Object is empty');
        }

        const message = new DIDMessage(json.action);
        message._id = json.id;
        message._status = json.status;
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

    public override validate(): boolean {
        return true;
    }
}
