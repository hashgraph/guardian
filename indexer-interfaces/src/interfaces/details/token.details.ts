import { Details } from './details.interface.js';
import { RawToken } from '../raw-token.interface.js';

/**
 * Token
 */
export type Token = RawToken;

/**
 * Token details
 */
export type TokenDetails = Details<Token, Token>;
