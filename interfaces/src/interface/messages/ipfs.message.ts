export interface IFileResponse {
    cid: string;
    url: string;
}

export interface IGetFileMessage {
    cid: string;
    responseType: 'raw' | 'str' | 'json'
}

export interface IAddFileMessage {
    content: string;
}

export interface IIpfsSettingsResponse {
    nftApiKey: string;
}