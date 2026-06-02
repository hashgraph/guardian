import { IPolicyDocument } from '../policy-engine.interface.js';

/**
 * Cached state per-user. Keeps last processed document and the last published messageId
 */
export interface CacheState {
    docs?: IPolicyDocument[];
}
