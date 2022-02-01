import { ISubmitModelMessage } from "..";

export interface ISchemaSubmitMessage extends ISubmitModelMessage {
    context_cid: string
}