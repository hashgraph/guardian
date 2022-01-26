import { ModelActionType } from "../type/model-action.type";

export interface ISubmitModelMessage {
    name: string,
    owner: string,
    cid: string,
    uuid: string,
    version: string,
    operation: ModelActionType
}
