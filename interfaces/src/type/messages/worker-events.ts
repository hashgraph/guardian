/**
 * Worker events
 */
export enum WorkerEvents {
    // QUEUE_UPDATED = 'queue-updated',
    // QUEUE_GET = 'queue-get',
    GET_FREE_WORKERS = 'get-free-workers',
    WORKER_FREE_RESPONSE = 'worker-free-response',
    WORKER_READY = 'worker-ready',
    SEND_TASK_TO_WORKER = 'send-task-to-worker',
    TASK_COMPLETE = 'complete-task',
    TASK_COMPLETE_BROADCAST = 'complete-task-broadcast',
    UPDATE_SETTINGS = 'update-settings',
    PUSH_TASK = 'push-task'
}
