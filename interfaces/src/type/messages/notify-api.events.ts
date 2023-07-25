/**
 * Notify api
 */
export enum NotifyAPI {
    GET_ALL = 'notify-all',
    GET_NEW = 'notify-get-new',
    GET_PROGRESSES = 'notify-get-progress',
    READ = 'notify-read',
    READ_ALL = 'notify-read-all',
    CREATE = 'notify-create',
    CREATE_PROGRESS = 'notify-create-progress',
    UPDATE = 'notify-update',
    UPDATE_PROGRESS = 'notify-update-progress',
    DELETE_PROGRESS = 'notfy-delete-progress',
    CREATE_PROGRESS_WS = 'notify-create-progress-ws',
    UPDATE_WS = 'notify-update-ws',
    UPDATE_PROGRESS_WS = 'notify-update-progress-ws',
    DELETE_WS = 'notify-delete-ws',
    DELETE_PROGRESS_WS = 'notify-delete-progress-ws',
    DELETE_UP_TO = 'notify-delete-up-to',
}
