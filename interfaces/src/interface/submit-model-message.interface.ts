export enum ModelActionType {
    PUBLISH = "PUBLISH"
}

export interface ISubmitModelMessage {
    name: string,
    owner: string,
    cid: string,
    uuid: string,
    version: string,
    operation: ModelActionType
}