import { Details } from './details.interface.js';
import { RawNFT } from '../raw-nft.interface.js';
import { VP } from './vp.details.js';

/**
 * NFT
 */
export type NFT = RawNFT;

/**
 * NFT details
 */
export interface NFTDetails extends Details<NFT, NFT> {
    labels?: VP[];
    history: any[];
}