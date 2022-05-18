export interface IUpdateBlockMessage {
    uuid: string
}

export interface IErrorBlockMessage {
    uuid: string;
    user: {
        did: string
    };
    blockType: string;
    message: any;
}
