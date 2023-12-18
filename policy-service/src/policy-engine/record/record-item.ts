import { RecordAction } from './action.type';
import { RecordMethod } from './method.type';

/**
 * Record item
 */
export interface RecordItem {
    /**
     * Record uuid
     */
    uuid?: string,
    /**
     * Policy ID
     */
    policyId?: string,
    /**
     * Method type
     */
    method?: RecordMethod,
    /**
     * Action type
     */
    action?: RecordAction,
    /**
     * Recorded time
     */
    time?: number,
    /**
     * User DID
     */
    user?: string,
    /**
     * Block tag
     */
    target?: string,
    /**
     * Document
     */
    document?: any,
}