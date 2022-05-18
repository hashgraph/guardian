export interface IMessageResponse<T> {
    readonly code: number;
    readonly body: T;
    readonly error: string;
}

export class MessageResponse<T> implements IMessageResponse<T> {
    public readonly code: number;
    public readonly body: T;
    public readonly error: string;

    constructor(body: T, code: number = 200) {
        this.code = code;
        this.body = body;
        this.error = null;
    }
}

export class BinaryMessageResponse implements IMessageResponse<string> {
    public readonly code: number;
    public readonly body: string;
    public readonly error: string;

    constructor(body: ArrayBuffer, code: number = 200) {
        this.code = code;
        this.body = Buffer.from(body).toString("base64");
        this.error = null;
    }
}

export class MessageError<T> implements IMessageResponse<T>, Error {
    public readonly body: T;
    public readonly error: string;
    public readonly code: number;
    public name: string;
    public message: string;

    constructor(error: string, code: number = 500) {
        this.code = code;
        this.body = null;
        this.error = error;

        this.name = error;
        this.message = error;
    }
}

export class MessageInitialization<T> implements IMessageResponse<T> {
    public readonly code: number;
    public readonly body: T;
    public readonly error: string;

    constructor() {
        this.code = 0;
        this.body = null;
        this.error = 'Initialization';
    }
}

export function Response<T>() {
    return (target: any, propertyKey: string, descriptor: TypedPropertyDescriptor<(...params: any[]) => Promise<any>>) => {
        let oldFunc = descriptor.value;
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
