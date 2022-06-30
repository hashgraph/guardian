import { IAuthUser } from "@guardian/common";
import { AnyBlockType } from "@policy-engine/policy-engine.interface";
import { EventActor, PolicyInputEventType, PolicyOutputEventType } from "./policy-event-type";

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
    public readonly actor: EventActor;

    private readonly callback?: EventCallback<T>;

    constructor(
        inputType: PolicyInputEventType,
        outputType: PolicyOutputEventType,
        source: AnyBlockType,
        target: AnyBlockType,
        actor: EventActor,
        fn: EventCallback<T>
    ) {
        this.type = inputType;
        this.inputType = inputType;
        this.outputType = outputType;
        this.policyId = source.policyId;
        this.source = source;
        this.target = target;
        this.actor = actor;
        this.callback = fn;
    }

    public run(user?: IAuthUser, data?: T): void {
        if (this.actor == EventActor.Owner) {
            user = this.createUser(this.getOwner(data));
        } else if (this.actor == EventActor.Issuer) {
            user = this.createUser(this.getIssuer(data));
        }
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

    private getOwner(data: any): string {
        console.log('getOwner', data);
        if (!data) {
            return null;
        }
        if (data.data) {
            data = Array.isArray(data.data) ? data.data[0] : data.data;
        }
        return data ? data.owner : null;
    }

    private getIssuer(data: any): string {
        console.log('getIssuer', data);
        if (!data) {
            return null;
        }
        if (data.data) {
            data = Array.isArray(data.data) ? data.data[0] : data.data;
        }
        if (data) {
            if (data.document) {
                return data.document.issuer;
            }
            return data.owner;
        }
        return null;
    }

    private createUser(did: string): IAuthUser {
        console.log('createUser', did)
        if (did) {
            return { did } as IAuthUser;
        }
        return null;
    }
}
