import { Details } from './details.interface.js';
import { RawToken } from '../raw-token.interface.js';
import { VP } from './vp.details.js';

/**
 * Token
 */
export type Token = RawToken;

/**
 * Token details
 */
export interface TokenDetails extends Details<Token, Token> {
    labels?: VP[];
}