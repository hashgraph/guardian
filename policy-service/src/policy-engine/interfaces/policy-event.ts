import { PolicyComponentsUtils } from '../policy-components-utils.js';
import { PolicyUtils } from '../helpers/utils.js';
import { AnyBlockType } from '../policy-engine.interface.js';
import { PolicyUser } from '../policy-user.js';
import { EventActor, PolicyInputEventType, PolicyOutputEventType } from './policy-event-type.js';
import { RecordActionStep } from '../record-action-step.js';

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
    user?: PolicyUser;
    /**
     * Data
     */
    data?: T;
    actionStatus?: RecordActionStep;
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
    public run(user: PolicyUser, data: T, actionStatus: RecordActionStep): void {
        this.getUser(user, data).then((_user) => {
            const event: IPolicyEvent<T> = {
                type: this.type,
                inputType: this.inputType,
                outputType: this.outputType,
                policyId: this.policyId,
                source: this.source.tag,
                sourceId: this.source.uuid,
                target: this.target.tag,
                targetId: this.target.uuid,
                user: _user,
                actionStatus,
                data
            };
            // const targetRef: any = this.target as any;
            // const prevStatus = targetRef?.actionStatus;
            // if (targetRef) {
                // targetRef.actionStatus = actionStatus;
            // }
        // console.log(event, 'event sync')
        // console.log(actionStatus, 'actionStatus')

            if (actionStatus) {
                // actionStatus.step += 1;
                actionStatus.inc();

                const res = this.callback.call(this.target, event);

                if (typeof res?.then === 'function') {
                    res.then(() => {
                        // actionStatus.step -= 1
                        actionStatus.dec();


                        // if (!actionStatus.step) {
                        //     actionStatus.callback()
                        // }
                    })
                } else {
                    actionStatus.dec();
                }
            } else{
                this.callback.call(this.target, event);
            }
            // if (targetRef) {
            //     targetRef.actionStatus = prevStatus;
            // }
        });
    }

    /**
     * Run sync event action
     * @param user
     * @param data
     */
    public async runSync(user: PolicyUser, data: T, actionStatus: RecordActionStep): Promise<any> {
        const _user = await this.getUser(user, data);
        const event: IPolicyEvent<T> = {
            type: this.type,
            inputType: this.inputType,
            outputType: this.outputType,
            policyId: this.policyId,
            source: this.source.tag,
            sourceId: this.source.uuid,
            target: this.target.tag,
            targetId: this.target.uuid,
            user: _user,
            actionStatus,
            data
        };
        // console.log(event, 'event async')
        // console.log(actionStatus, 'actionStatus')

        // const targetRef: any = this.target as any;
        // const prevStatus = targetRef?.actionStatus;
        // if (targetRef) {
        //     targetRef.actionStatus = actionStatus;
        // }

        try {
            if (actionStatus) {
                actionStatus.inc()

                const res = await this.callback.bind(this.target)(event);

                actionStatus.dec()

                return res;
            } else {
                return await this.callback.bind(this.target)(event);
            }
        } finally {
            // if (targetRef) {
            //     targetRef.actionStatus = prevStatus;
            // }
        }
    }
    /**
     * Get owner
     * @param user
     * @param data
     * @private
     */
    private async getUser(user: PolicyUser, data: T): Promise<PolicyUser> {
        if (this.actor === EventActor.Owner) {
            return await this.getOwner(user, data);
        } else if (this.actor === EventActor.Issuer) {
            return await this.getIssuer(user, data);
        } else {
            return user;
        }
    }

    /**
     * Get owner
     * @param user
     * @param data
     * @private
     */
    private async getOwner(user: PolicyUser, data: any): Promise<PolicyUser> {
        if (!data) {
            return null;
        }
        if (data.data) {
            data = Array.isArray(data.data) ? data.data[0] : data.data;
        }
        if (user && user.equal(data.owner, data.group)) {
            return user;
        } else {
            return await PolicyComponentsUtils.GetPolicyUserByDID(data.owner, data.group, this.target, user.userId);
        }
    }

    /**
     * Get issuer
     * @param user
     * @param data
     * @private
     */
    private async getIssuer(user: PolicyUser, data: any): Promise<PolicyUser> {
        if (!data) {
            return null;
        }
        if (data.data) {
            data = Array.isArray(data.data) ? data.data[0] : data.data;
        }
        if (data) {
            let did = data.owner;
            if (data.document) {
                did = PolicyUtils.getDocumentIssuer(data.document);
            }
            if (user && user.equal(did, data.group)) {
                return user;
            } else {
                return await PolicyComponentsUtils.GetPolicyUserByDID(did, data.group, this.target, user.userId);
            }
        }
        return null;
    }

    /**
     * Destructor
     */
    public destroy(): void {
        return;
    }

    /**
     * Equals
     */
    public equals(link: PolicyLink<T>): boolean {
        return (
            this.target?.tag === link?.target?.tag &&
            this.source?.tag === link?.source?.tag &&
            this.inputType === link?.inputType &&
            this.outputType === link?.outputType &&
            this.actor === link?.actor
        );
    }
}
