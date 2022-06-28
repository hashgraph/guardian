import { LogType } from "../type/log.type"

/**
 * Log interface
 */
export interface ILog {
    /**
     * Log message
     */
    message?: string;
    /**
     * Log type
     */
    type: LogType;
    /**
     * Log attributes
     */
    attributes?: string[];
    /**
     * Log level
     */
    level?: number;
}
