export interface IMessageResponse<T> {
    readonly body: T;
    readonly error: string;
    readonly code: number;
}

export class MessageResponse<T> implements IMessageResponse<T> {
    public readonly body: T;
    public readonly error: string;
    public readonly code: number;

    constructor(body: T, code: number = 200) {
        this.body = body;
        this.error = null;
        this.code = code;
    }
}

export class MessageError implements IMessageResponse<any>, Error {
    public readonly body: any;
    public readonly error: string;
    public readonly code: number;
    public readonly name: string;
    public readonly message: string;

    constructor(error: string, code: number = 500) {
        this.body = null;
        this.error = error;
        this.code = code;
        this.name = error;
        this.message = error;
    }
}

export function Response<T>() {
    return (target: any, propertyKey: string, descriptor: TypedPropertyDescriptor<(...params: any[]) => Promise<any>>) => {
        let oldFunc = descriptor.value;
        descriptor.value = async function () {
            const response: IMessageResponse<T> = await oldFunc.apply(this, arguments);
            if (response.error) {
                throw response.error;
            }
            return response.body;
        }
    }
}