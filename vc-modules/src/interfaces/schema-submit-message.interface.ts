import { ISubmitModelMessage } from "./submit-model-message.interface";

export interface ISchemaSubmitMessage extends ISubmitModelMessage {
    uuid: string,
    description: string,
    entity: string,
    document_cid: string,
    document_url: string,
    context_cid: string,
    context_url: string
}