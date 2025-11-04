/**
 * Policy action type
 */
export enum PolicyActionType {
    ACTION = 'ACTION',
    REQUEST = 'REQUEST',
    REMOTE_ACTION = 'REMOTE_ACTION',
}

export enum PolicyActionStatus {
    NEW = 'NEW',
    ERROR = 'ERROR',
    COMPLETED = 'COMPLETED',
    REJECTED = 'REJECTED',
    CANCELED = 'CANCELED'
}