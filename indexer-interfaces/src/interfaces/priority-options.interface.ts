import { PriorityStatus } from '../types';

/**
 * Search item
 */
export class PriorityOptions {
    /**
     * Priority Date
     */
    priorityDate?: Date;
    /**
     * Priority Status
     */
    priorityStatus?: PriorityStatus;
    /**
     * Priority Status Date
     */
    priorityStatusDate?: Date;
    /**
     * Priority Timestamp
     */
    priorityTimestamp?: number;
    /**
     * Inherit Priority
     */
    inheritPriority?: boolean;
}
