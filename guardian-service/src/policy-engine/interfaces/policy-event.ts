import { IAuthUser } from "@auth/auth.interface";
import { AnyBlockType } from "@policy-engine/policy-engine.interface";
import { PolicyInputEventType, PolicyOutputEventType } from "./policy-event-type";

export type EventCallback<T> = (event: IPolicyEvent<T>) => void;

export interface IPolicyEvent<T> {
    type: PolicyInputEventType; // Event Type;
    inputType: PolicyInputEventType;
    outputType: PolicyOutputEventType;
    policyId: string; // Policy Id;
    source: string; // Block Tag;
    sourceId: string; // Block Id;
    target?: string; // Block Tag;
    targetId?: string; // Block Id;
    user?: IAuthUser;
    data?: T;
}

export class PolicyLink<T> {
    public readonly type: PolicyInputEventType;
    public readonly inputType: PolicyInputEventType;
    public readonly outputType: PolicyOutputEventType;
    public readonly policyId: string;
    public readonly source: AnyBlockType;
    public readonly target: AnyBlockType;
    private readonly callback?: EventCallback<T>;

    constructor(
        inputType: PolicyInputEventType, 
        outputType: PolicyOutputEventType, 
        source: AnyBlockType, 
        target: AnyBlockType, 
        fn: EventCallback<T>
    ) {
        this.type = inputType;
        this.inputType = inputType;
        this.outputType = outputType;
        this.policyId = source.policyId;
        this.source = source;
        this.target = target;
        this.callback = fn;
    }

    public run(user?: IAuthUser, data?: T): void {
        this.callback.call(this.target, {
            type: this.type,
            inputType: this.inputType,
            outputType: this.outputType,
            policyId: this.policyId,
            source: this.source.tag,
            sourceId: this.source.uuid,
            target: this.target.tag,
            targetId: this.target.uuid,
            user: user,
            data: data
        })
    }
}