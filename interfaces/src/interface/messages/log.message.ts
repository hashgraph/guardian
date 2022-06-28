import { ILog } from "../log.interface";
import { IPageParameters } from "../page-parameters.interface"

/**
 * Get logs message interface
 */
export interface IGetLogsMessage {
    /**
     * Log filters
     */
    filters?: { [x: string]: any }
    /**
     * Page parameters
     */
    pageParameters?: IPageParameters;
    /**
     * Sort direction
     */
    sortDirection?: 'ASC' | 'DESC';
}

/**
 * Get logs response interface
 */
export interface IGetLogsResponse {
    /**
     * Logs
     */
    logs: ILog[];
    /**
     * Total log items count
     */
    totalCount: number;
}

/**
 * Get log attributes message
 */
export interface IGetLogAttributesMessage {
    /**
     * Attribute name
     */
    name: string;
    /**
     * Existing attributes
     */
    existingAttributes: string[];
}
