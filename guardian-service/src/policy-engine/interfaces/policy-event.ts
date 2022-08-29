import { PolicyUtils } from '@policy-engine/helpers/utils';
import { AnyBlockType } from '@policy-engine/policy-engine.interface';
import { IPolicyUser, PolicyUser } from '@policy-engine/policy-user';
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
    user?: IPolicyUser;
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
    public run(user?: IPolicyUser, data?: T): void {
        if (this.actor === EventActor.Owner) {
            user = this.getOwner(data);
        } else if (this.actor === EventActor.Issuer) {
            user = this.getIssuer(data);
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
    private getOwner(data: any): IPolicyUser {
        if (!data) {
            return null;
        }
        if (data.data) {
            data = Array.isArray(data.data) ? data.data[0] : data.data;
        }
        return this.createUser(data.owner, data.group);
    }

    /**
     * Get issuer
     * @param data
     * @private
     */
    private getIssuer(data: any): IPolicyUser {
        if (!data) {
            return null;
        }
        if (data.data) {
            data = Array.isArray(data.data) ? data.data[0] : data.data;
        }
        if (data) {
            if (data.document) {
                return this.createUser(PolicyUtils.getDocumentIssuer(data.document), data.group);
            }
            return this.createUser(data.owner, data.group)
        }
        return null;
    }

    /**
     * Create user
     * @param did
     * @private
     */
    private createUser(did: string, group: string): IPolicyUser {
        if (did) {
            const user = new PolicyUser(did, !!this.target?.dryRun);
            if (group) {
                user.setGroup({ role: null, uuid: group });
            }
            return user;
        }
        return null;
    }

    /**
     * Destructor
     */
    public destroy(): void {
        return;
    }
}
