/**
 * Worker events
 */
export enum WorkerEvents {
    QUEUE_UPDATED = 'queue-updated',
    QUEUE_GET = 'queue-get',
    TASK_COMPLETE = 'complete-task',
    TASK_COMPLETE_BROADCAST = 'complete-task-broadcast',
    UPDATE_SETTINGS = 'update-settings',
    PUSH_TASK = 'push-task'
}
