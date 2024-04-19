/**
 * Message response interface
 */
export interface IMessageResponse<T> {
    /**
     * Response body
     */
    readonly body: T;
    /**
     * Response code
     */
    readonly code: number;
    /**
     * Response error message
     */
    readonly error: string;
}

/**
 * Message response class
 */
export class MessageResponse<T> implements IMessageResponse<T> {
    /**
     * Response body
     */
    public readonly body: T;
    /**
     * Response code
     */
    public readonly code: number;
    /**
     * Response error message
     */
    public readonly error: string;

    constructor(body: T, code: number = 200) {
        this.code = code;
        this.body = body;
        this.error = null;
    }
}

/**
 * Message error class
 */
export class MessageError implements IMessageResponse<any>, Error {
    /**
     * Response body
     */
    readonly body: any;
    /**
     * Response code
     */
    readonly code: number;
    /**
     * Response error message
     */
    readonly error: string;
    /**
     * Error name
     */
    public name: string;
    /**
     * Error message
     */
    public message: string;

    constructor(error: string | Error, code: number = 500) {
        this.code = code;
        this.body = null;
        if (error) {
            if (typeof error === 'string') {
                this.error = error;
            } else {
                this.error = error.message;
            }
        } else {
            this.error = 'Unknown error.';
        }
        this.name = this.error;
        this.message = this.error;
    }
}

export type AnyResponse<T> = MessageError | MessageResponse<T>;

/**
 * Response function
 */
export function responseFrom<T>(response: AnyResponse<T>): T {
    if (response.error) {
        throw response.error;
    }
    return response.body;
}
