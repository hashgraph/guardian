import { PriorityStatus } from '../types/priority-status.type.js';

/**
 * Data Priority Loading Progress
 */
export class DataPriorityLoadingProgress {
    /**
     * Entity type
     */
    type: 'Topic' | 'Token';
    /**
     * Topic Id
     */
    entityId: string;
    /**
     * Added to priority queue date
     */
    priorityDate: Date;
    /**
     * Priority status date
     */
    priorityStatusDate: Date;
    /**
     * Priority status
     */
    priorityStatus: PriorityStatus;
}
