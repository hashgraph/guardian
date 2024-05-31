import { NFT } from "./nft.interface.js";

export interface TokenInstances {
    links: {
        next: string | null;
    };
    nfts: NFT[];
    _status?: {
        messages: {
            message: string;
        }[];
    };
}
