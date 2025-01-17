/**
 * Message Status
 */
export enum MessageStatus {
    NONE = '',
    COMPRESSING = 'COMPRESSING',
    COMPRESSED = 'COMPRESSED',
    LOADING = 'LOADING',
    LOADED = 'LOADED',
    ERROR = 'ERROR',
    UNSUPPORTED = 'UNSUPPORTED'
}