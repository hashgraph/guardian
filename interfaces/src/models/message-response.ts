export interface IMessageResponse<T> {
    readonly code: number;
    readonly body: T;
    readonly error: string;
}

export class MessageResponse<T> implements IMessageResponse<T> {
    public readonly code: number;
    public readonly body: T;
    public readonly error: string;

    constructor(body: T) {
        this.code = 200;
        this.body = body;
        this.error = null;
    }
}

export class MessageError<T> implements IMessageResponse<T> {
    public readonly code: number;
    public readonly body: T;
    public readonly error: string;

    constructor(error: string) {
        this.code = 500;
        this.body = null;
        this.error = error;
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
            if (response.code === 500) {
                throw response.error;
            }
            if (response.code === 0) {
                throw new Error('Initialization');
            }
            return response.body;
        }
    }
}
