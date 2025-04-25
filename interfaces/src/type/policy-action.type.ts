/**
 * Policy action type
 */
export enum PolicyActionType {
    ACTION = 'ACTION',
    REQUEST = 'REQUEST',
}

export enum PolicyActionStatus {
    NEW = 'NEW',
    ERROR = 'ERROR',
    COMPLETED = 'COMPLETED',
    REJECT = 'REJECT'
}