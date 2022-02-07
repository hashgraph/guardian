export interface IMessageResponse<T> {
    readonly body: T;
    readonly error: string;
}

export class MessageResponse<T> implements IMessageResponse<T> {
    public readonly body: T;
    public readonly error: string;

    constructor(body: T) {
        this.body = body;
        this.error = null;
    }
}

export class MessageError<T> implements IMessageResponse<T> {
    public readonly body: T;
    public readonly error: string;

    constructor(error: string) {
        this.body = null;
        this.error = error;
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