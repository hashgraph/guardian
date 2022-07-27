/**
 * File response interface
 */
export interface IFileResponse {
    /**
     * CID hash
     */
    cid: string;
    /**
     * File url
     */
    url: string;
}

/**
 * Get file message interface
 */
export interface IGetFileMessage {
    /**
     * CID hash
     */
    cid: string;
    /**
     * Response type
     */
    responseType: 'raw' | 'str' | 'json'
}

/**
 * Add file message interface
 */
export interface IAddFileMessage {
    /**
     * Content
     */
    content: string;
}

/**
 * IPFS settings response interface
 */
export interface IIpfsSettingsResponse {
    /**
     * NFT api key
     */
    nftApiKey: string;
}
