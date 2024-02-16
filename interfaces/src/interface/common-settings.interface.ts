/**
 * Common settings interface
 */
export interface CommonSettings {
    /**
     * Operator id
     */
    operatorId?: string,
    /**
     * Operator key
     */
    operatorKey?: string,
    /**
     * NFT api key
     * @deprecated 2022-10-08
     */
    nftApiKey?: string,

    /**
     * IPFS Storage API KEY
     */
    ipfsStorageApiKey?: string
}
