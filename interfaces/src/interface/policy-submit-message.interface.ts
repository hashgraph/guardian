import { ISubmitModelMessage } from "..";

export interface IPolicySubmitMessage extends ISubmitModelMessage {
    uuid: string,
    description: string,
    topicDescription: string,
    policyTag: string,
    cid: string,
    url: string,
}