import { PriorityStatus } from '../types/priority-status.type.js';

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
     * Priority timestamp
     */
    priorityTimestamp?: number;
}
