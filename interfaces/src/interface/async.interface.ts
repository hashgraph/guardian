/**
 * Supported types of status
 */
export enum StatusType {
    PROCESSING = 'Processing',
    COMPLETED = 'Completed',
    INFO = 'Info',
    ERROR = 'Error'
};

/**
 * Status
 */
export interface IStatus {
    /**
     * Message of status
     */
    message: string;
    /**
     * Type of status
     */
    type: StatusType;
}