/**
 * URL interface
 */
export interface IURL {
    /**
     * CID
     */
    cid: string;
    /**
     * URL
     */
    url: string;
}

/**
 * URL type
 */
export enum UrlType {
    url = 'url',
    cid = 'cid'
}
