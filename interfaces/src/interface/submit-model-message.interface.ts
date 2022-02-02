export enum ModelActionType {
    PUBLISH = "PUBLISH"
}

export interface ISubmitModelMessage {
    name: string,
    owner: string,
    version: string,
    operation: ModelActionType
}