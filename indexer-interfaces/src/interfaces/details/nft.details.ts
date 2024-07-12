import { Details } from './details.interface.js';
import { RawNFT } from '../raw-nft.interface.js';

/**
 * NFT
 */
export type NFT = RawNFT;

/**
 * NFT details
 */
export type NFTDetails = Details<NFT, NFT> & { history: any[] };
