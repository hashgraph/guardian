import { IAuthUser } from '@guardian/common';
import { AnyBlockType } from '@policy-engine/policy-engine.interface';
import { EventActor, PolicyInputEventType, PolicyOutputEventType } from './policy-event-type';

/**
 * Event callback type
 */
export type EventCallback<T> = (event: IPolicyEvent<T>) => void;

/**
 * Policy event
 */
export interface IPolicyEvent<T> {
    /**
     * Event type
     */
    type: PolicyInputEventType;
    /**
     * Input event type
     */
    inputType: PolicyInputEventType;
    /**
     * Output event type
     */
    outputType: PolicyOutputEventType;
    /**
     * Policy id
     */
    policyId: string;
    /**
     * Block tag
     */
    source: string;
    /**
     * Block id
     */
    sourceId: string;
    /**
     * Block tag
     */
    target?: string;
    /**
     * Block id
     */
    targetId?: string;
    /**
     * User
     */
    user?: IAuthUser;
    /**
     * Data
     */
    data?: T;
}

/**
 * Policy link class
 */
export class PolicyLink<T> {
    /**
     * Event type
     */
    public readonly type: PolicyInputEventType;
    /**
     * Input event type
     */
    public readonly inputType: PolicyInputEventType;
    /**
     * Output event type
     */
    public readonly outputType: PolicyOutputEventType;
    /**
     * Policy id
     */
    public readonly policyId: string;
    /**
     * Source block
     */
    public readonly source: AnyBlockType;
    /**
     * Target block
     */
    public readonly target: AnyBlockType;
    /**
     * Event actor
     */
    public readonly actor: EventActor;

    /**
     * Event callback
     * @private
     */
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

    /**
     * Run event action
     * @param user
     * @param data
     */
    public run(user?: IAuthUser, data?: T): void {
        if (this.actor === EventActor.Owner) {
            user = this.createUser(this.getOwner(data));
        } else if (this.actor === EventActor.Issuer) {
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
            user,
            data
        })
    }

    /**
     * Get owner
     * @param data
     * @private
     */
    private getOwner(data: any): string {
        if (!data) {
            return null;
        }
        if (data.data) {
            data = Array.isArray(data.data) ? data.data[0] : data.data;
        }
        return data ? data.owner : null;
    }

    /**
     * Get issuer
     * @param data
     * @private
     */
    private getIssuer(data: any): string {
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

    /**
     * Create user
     * @param did
     * @private
     */
    private createUser(did: string): IAuthUser {
        if (did) {
            return { did } as IAuthUser;
        }
        return null;
    }
}
