/**
 * Message response interface
 */
export interface IMessageResponse<T> {
    /**
     * Response code
     */
    readonly code: number;
    /**
     * Response body
     */
    readonly body: T;
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
     * Response code
     */
    public readonly code: number;
    /**
     * Response body
     */
    public readonly body: T;
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
 * Binary message response class
 */
export class BinaryMessageResponse implements IMessageResponse<string> {
    /**
     * Response code
     */
    public readonly code: number;
    /**
     * Response body
     */
    public readonly body: string;
    /**
     * Response error message
     */
    public readonly error: string;

    constructor(body: ArrayBuffer, code: number = 200) {
        this.code = code;
        this.body = Buffer.from(body).toString('base64');
        this.error = null;
    }
}

/**
 * Message error class
 */
export class MessageError<T> implements IMessageResponse<T>, Error {
    /**
     * Message body
     */
    public readonly body: T;
    /**
     * Error body
     */
    public readonly error: string;
    /**
     * Error code
     */
    public readonly code: number;
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
        this.error = typeof error === 'string' ? error : error.message;

        this.name = this.error;
        this.message = this.error;
    }
}

/**
 * Initialization message class
 */
export class MessageInitialization<T> implements IMessageResponse<T> {
    /**
     * Message code
     */
    public readonly code: number;
    /**
     * Message body
     */
    public readonly body: T;
    /**
     * Message error
     */
    public readonly error: string;

    constructor() {
        this.code = 0;
        this.body = null;
        this.error = 'Initialization';
    }
}

/**
 * Response function
 */
export function Response<T>() {
    return (target: any, propertyKey: string, descriptor: TypedPropertyDescriptor<(...params: any[]) => Promise<any>>) => {
        const oldFunc = descriptor.value;
        descriptor.value = async function () {
            const response: IMessageResponse<T> = await oldFunc.apply(this, arguments);
            if (response.code === 0) {
                throw new Error('Initialization');
            }
            if (response.error) {
                throw response.error;
            }
            return response.body;
        }
    }
}
