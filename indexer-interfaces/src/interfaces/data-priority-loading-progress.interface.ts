import { PriorityStatus } from "../types";

/**
 * Data Priority Loading Progress
 */
export class DataPriorityLoadingProgress {
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
