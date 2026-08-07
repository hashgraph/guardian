/**
 * A message could not be loaded. Carries an HTTP-style code so callers can
 * surface an actionable 4xx rather than a generic 500 / null.
 */
export abstract class MessageLoadError extends Error {
    public readonly code: number;
    public readonly messageId?: string;

    protected constructor(name: string, code: number, message: string, messageId?: string, cause?: unknown) {
        super(message, { cause });
        this.name = name;
        this.code = code;
        this.messageId = messageId;
    }
}

/**
 * The HTTP-style code to report for an error, or undefined when there is none to
 * forward. Only message load errors carry a code that is a valid HTTP status —
 * a Mongo duplicate-key error (11000) or a Node/NATS string code would otherwise
 * reach `new HttpException(message, code)` as an invalid status.
 * @param error
 */
export function loadErrorCode(error: unknown): number | undefined {
    return error instanceof MessageLoadError ? error.code : undefined;
}

/**
 * Message found on Hedera but its IPFS documents could not be loaded (unpinned,
 * offline, or timed out).
 */
export class MessageIpfsError extends MessageLoadError {
    constructor(messageId?: string, cause?: unknown) {
        super('MessageIpfsError', 422,
            `IPFS_UNAVAILABLE: IPFS data for message ${messageId} could not be retrieved. It may be unpinned or the source node is offline.`,
            messageId, cause);
    }
}

/**
 * Message could not be retrieved from Hedera (unknown id, wrong network, mirror
 * node unavailable, or an unreadable payload).
 */
export class MessageNotFoundError extends MessageLoadError {
    constructor(messageId?: string, cause?: unknown) {
        super('MessageNotFoundError', 404, messageId
            ? `MESSAGE_NOT_FOUND: Message ${messageId} could not be retrieved. Check the message id and that it belongs to the current Hedera network.`
            : 'MESSAGE_NOT_FOUND: Message id is not set.',
            messageId, cause);
    }
}
