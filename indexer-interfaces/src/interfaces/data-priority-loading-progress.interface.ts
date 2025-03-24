import { PriorityStatus } from "../types";

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
    /**
     * Last update
     */
    lastUpdate: number;
    /**
     * Has next message
     */
    hasNext: boolean;
}
