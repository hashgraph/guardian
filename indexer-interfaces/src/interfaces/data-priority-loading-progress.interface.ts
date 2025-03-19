import { PriorityStatus } from "../types";

/**
 * Data Priority Loading Progress
 */
export class DataPriorityLoadingProgress {
    /**
     * Topic Id
     */
    topicId: string;
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
