import moment from 'moment';
import { CronJob } from 'cron';
import { ActionCallback, BasicBlock, StateField } from '../helpers/decorators/index.js';
import { PolicyComponentsUtils } from '../policy-components-utils.js';
import { AnyBlockType, IPolicyEventState } from '../policy-engine.interface.js';
import { PolicyInputEventType, PolicyOutputEventType } from '../interfaces/policy-event-type.js';
import { IPolicyEvent } from '../interfaces/index.js';
import { ChildrenType, ControlType } from '../interfaces/block-about.js';
import { PolicyUtils } from '../helpers/utils.js';
import { ExternalEvent, ExternalEventType } from '../interfaces/external-event.js';
import { LocationType, PolicyStatus } from '@guardian/interfaces';

/**
 * Timer block
 */
@BasicBlock({
    blockType: 'timerBlock',
    commonBlock: true,
    actionType: LocationType.REMOTE,
    about: {
        label: 'Timer',
        title: `Add 'Timer' Block`,
        post: false,
        get: false,
        children: ChildrenType.None,
        control: ControlType.Special,
        input: [
            PolicyInputEventType.RunEvent,
            PolicyInputEventType.StartTimerEvent,
            PolicyInputEventType.StopTimerEvent
        ],
        output: [
            PolicyOutputEventType.RunEvent,
            PolicyOutputEventType.RefreshEvent,
            PolicyOutputEventType.TimerEvent
        ],
        defaultEvent: true
    },
    variables: []
})
export class TimerBlock {
    /**
     * Block state
     * @private
     */
    @StateField()
    private readonly state: { [key: string]: boolean } = {};

    /**
     * Tick count
     * @private
     */
    private tickCount: number;
    /**
     * Interval
     * @private
     */
    private interval: number;
    /**
     * Cron job
     * @private
     */
    private job: CronJob;
    /**
     * End time
     * @private
     */
    private endTime: number;

    /**
     * After init callback
     */
    afterInit() {
        const ref = PolicyComponentsUtils.GetBlockRef<AnyBlockType>(this);
        if (ref.policyInstance.status !== PolicyStatus.DISCONTINUED) {
            this.startCron(ref);
        }
    }

    /**
     * Block destructor
     */
    destroy() {
        if (this.job) {
            this.job.stop();
        }
    }

    /**
     * Start cron
     * @param event
     * @private
     */
    private getUserId(event: IPolicyEvent<IPolicyEventState>): string {
        try {
            const document = event.data?.data;
            if (document) {
                if (Array.isArray(document)) {
                    if (document.length) {
                        return PolicyUtils.getScopeId(document[0]);
                    }
                } else {
                    return PolicyUtils.getScopeId(document);
                }
            }
            return null;
        } catch (error) {
            return null;
        }
    }

    /**
     * Start cron
     * @param ref
     * @private
     */
    private startCron(ref: AnyBlockType) {
        try {
            let sd = moment(ref.options.startDate).utc();
            if (sd.isValid()) {
                sd = moment().utc();
            }

            this.endTime = Infinity;
            if (ref.options.endDate) {
                const ed = moment(ref.options.endDate).utc();
                if (ed.isValid()) {
                    this.endTime = ed.toDate().getTime();
                }
            }

            const now = new Date();
            if (now.getTime() > this.endTime) {
                return;
            }

            let mask: string = '';
            this.interval = 0;
            switch (ref.options.period) {
                case 'yearly': {
                    mask = `${sd.minute()} ${sd.hour()} ${sd.date()} ${sd.month() + 1} *`;
                    break;
                }
                case 'monthly': {
                    mask = `${sd.minute()} ${sd.hour()} ${sd.date()} * *`;
                    break;
                }
                case 'weekly': {
                    mask = `${sd.minute()} ${sd.hour()} * * ${sd.weekday()}`;
                    break;
                }
                case 'daily': {
                    mask = `${sd.minute()} ${sd.hour()} * * *`;
                    break;
                }
                case 'hourly': {
                    mask = `${sd.minute()} * * * *`;
                    break;
                }
                case 'custom': {
                    mask = ref.options.periodMask;
                    this.interval = ref.options.periodInterval;
                    break;
                }
                default:
                    throw new Error('Bad period')
            }
            ref.log(`start scheduler: ${mask}, ${ref.options.startDate}, ${ref.options.endDate}, ${ref.options.periodInterval}`);
            if (this.interval > 1) {
                this.tickCount = 0;
                this.job = new CronJob(mask, () => {
                    const _now = new Date();
                    if (_now.getTime() > this.endTime) {
                        ref.log(`stop scheduler: ${_now.getTime()}, ${this.endTime}`);
                        this.job.stop();
                        PolicyComponentsUtils.ExternalEventFn(new ExternalEvent(ExternalEventType.StopCron, ref, null, null));
                        return;
                    }
                    this.tickCount++;
                    if (this.tickCount < this.interval) {
                        ref.log(`skip tick scheduler`);
                        return;
                    }
                    this.tickCount = 0;
                    this.tickCron(ref).then();
                }, null, false, 'UTC');
            } else {
                this.job = new CronJob(mask, () => {
                    const _now = new Date();
                    if (_now.getTime() > this.endTime) {
                        ref.log(`stop scheduler: ${_now.getTime()}, ${this.endTime}`);
                        this.job.stop();
                        PolicyComponentsUtils.ExternalEventFn(new ExternalEvent(ExternalEventType.StopCron, ref, null, null));
                        return;
                    }
                    this.tickCron(ref).then();
                }, null, false, 'UTC');
            }
            this.job.start();
        } catch (error) {
            ref.log(`start scheduler fail ${PolicyUtils.getErrorMessage(error)}`);
            throw new Error(`start scheduler fail ${PolicyUtils.getErrorMessage(error)}`);
        }

        PolicyComponentsUtils.ExternalEventFn(new ExternalEvent(ExternalEventType.StartCron, ref, null, null));
    }

    /**
     * Tick cron
     * @param ref
     * @private
     */
    @ActionCallback({
        output: PolicyOutputEventType.TimerEvent
    })
    private async tickCron(ref: AnyBlockType) {
        ref.log(`tick scheduler`);

        const users = Object.keys(this.state);
        const map: string[] = [];
        for (const id of users) {
            if (this.state[id] === true) {
                map.push(id);
            }
        }

        await ref.triggerEvents<string[]>(PolicyOutputEventType.TimerEvent, null, map, null);
        PolicyComponentsUtils.ExternalEventFn(new ExternalEvent(ExternalEventType.TickCron, ref, null, null));
        ref.backup();
    }

    /**
     * Run block action
     * @event PolicyEventType.Run
     * @param {IPolicyEvent} event
     */
    @ActionCallback({
        output: [PolicyOutputEventType.RunEvent, PolicyOutputEventType.RefreshEvent]
    })
    async runAction(event: IPolicyEvent<IPolicyEventState>) {
        const ref = PolicyComponentsUtils.GetBlockRef(this);
        const id = this.getUserId(event);
        if (id) {
            this.state[id] = true;
            ref.log(`start scheduler for: ${id}`);
        }
        await ref.saveState();

        await ref.triggerEvents(PolicyOutputEventType.RunEvent, event.user, event.data, event.actionStatus);
        await ref.triggerEvents(PolicyOutputEventType.ReleaseEvent, event.user, null, event.actionStatus);
        await ref.triggerEvents(PolicyOutputEventType.RefreshEvent, event.user, event.data, event.actionStatus);
        PolicyComponentsUtils.ExternalEventFn(new ExternalEvent(ExternalEventType.Run, ref, event?.user, null));
        ref.backup();
    }

    /**
     * Start action callback
     * @event PolicyEventType.StartTimerEvent
     * @param {IPolicyEvent} event
     */
    @ActionCallback({
        type: PolicyInputEventType.StartTimerEvent
    })
    async startAction(event: IPolicyEvent<IPolicyEventState>) {
        const ref = PolicyComponentsUtils.GetBlockRef(this);
        const id = this.getUserId(event);
        if (id) {
            this.state[id] = true;
            ref.log(`start scheduler for: ${id}`);
        }
        await ref.saveState();
        ref.backup();
    }

    /**
     * Stop action callback
     * @event PolicyEventType.StopTimerEvent
     * @param {IPolicyEvent} event
     */
    @ActionCallback({
        type: PolicyInputEventType.StopTimerEvent
    })
    async stopAction(event: IPolicyEvent<IPolicyEventState>) {
        const ref = PolicyComponentsUtils.GetBlockRef(this);
        const id = this.getUserId(event);
        if (id) {
            this.state[id] = false;
            ref.log(`stop scheduler for: ${id}`);
        }
        await ref.saveState();
        ref.backup();
    }
}
