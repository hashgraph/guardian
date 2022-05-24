import moment from 'moment';
import { CronJob } from 'cron';
import { ActionCallback, BasicBlock, StateField } from '@policy-engine/helpers/decorators';
import { PolicyValidationResultsContainer } from '@policy-engine/policy-validation-results-container';
import { PolicyComponentsUtils } from '../policy-components-utils';
import { AnyBlockType } from '@policy-engine/policy-engine.interface';
import { Users } from '@helpers/users';
import { Inject } from '@helpers/decorators/inject';
import { PolicyInputEventType as PolicyInputEventType, PolicyOutputEventType } from '@policy-engine/interfaces/policy-event-type';
import { IPolicyEvent } from '@policy-engine/interfaces';
import { ChildrenType, ControlType } from '@policy-engine/interfaces/block-about';

/**
 * Aggregate block
 */
@BasicBlock({
    blockType: 'timerBlock',
    commonBlock: true,
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
    }
})
export class TimerBlock {
    @StateField()
    private state: { [key: string]: boolean } = {};

    @Inject()
    private users: Users;

    private tickCount: number;
    private interval: number;
    private job: CronJob;
    private endTime: number;

    public beforeInit(): void {
    }

    afterInit() {
        const ref = PolicyComponentsUtils.GetBlockRef<AnyBlockType>(this);
        this.startCron(ref);
    }

    destroy() {
        if (this.job) {
            this.job.stop();
        }
    }

    private startCron(ref: AnyBlockType) {
        try {
            let sd = moment(ref.options.startDate).utc();
            if (sd.isValid()) {
                sd = moment().utc();
            }

            this.endTime = Infinity;
            if (ref.options.endDate) {
                let ed = moment(ref.options.endDate).utc();
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
            }
            ref.log(`start scheduler: ${mask}, ${ref.options.startDate}, ${ref.options.endDate}, ${ref.options.periodInterval}`);
            if (this.interval > 1) {
                this.tickCount = 0;
                this.job = new CronJob(mask, () => {
                    const now = new Date();
                    if (now.getTime() > this.endTime) {
                        ref.log(`stop scheduler: ${now.getTime()}, ${this.endTime}`);
                        this.job.stop();
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
                    const now = new Date();
                    if (now.getTime() > this.endTime) {
                        ref.log(`stop scheduler: ${now.getTime()}, ${this.endTime}`);
                        this.job.stop();
                        return;
                    }
                    this.tickCron(ref).then();
                }, null, false, 'UTC');
            }
            this.job.start();
        } catch (error) {
            ref.log(`start scheduler fail ${error.message}`);
            throw `start scheduler fail ${error.message}`;
        }
    }

    @ActionCallback({
        output: PolicyOutputEventType.TimerEvent
    })
    private async tickCron(ref: AnyBlockType) {
        ref.log(`tick scheduler`);

        const users = Object.keys(this.state);
        const map = [];
        for (let did of users) {
            if (this.state[did] === true) {
                map.push(did);
            }
        }

        ref.triggerEvents(PolicyOutputEventType.TimerEvent, null, map);
    }

    /**
     * @event PolicyEventType.Run
     * @param {IPolicyEvent} event
     */
    @ActionCallback({
        output: [PolicyOutputEventType.RunEvent, PolicyOutputEventType.RefreshEvent]
    })
    async runAction(event: IPolicyEvent<any>) {
        const ref = PolicyComponentsUtils.GetBlockRef(this);
        const owner: string = event.data?.data?.owner;
        if (owner) {
            this.state[owner] = true;
            ref.log(`start scheduler for: ${owner}`);
        }
        await ref.saveState();

        ref.triggerEvents(PolicyOutputEventType.RunEvent, event.user, event.data);
        ref.triggerEvents(PolicyOutputEventType.RefreshEvent, event.user, event.data);
    }

    /**
     * @event PolicyEventType.StartTimerEvent
     * @param {IPolicyEvent} event
     */
    @ActionCallback({
        type: PolicyInputEventType.StartTimerEvent
    })
    async startAction(event: IPolicyEvent<any>) {
        const ref = PolicyComponentsUtils.GetBlockRef(this);
        const owner: string = event.data?.data?.owner;
        if (owner) {
            this.state[owner] = true;
            ref.log(`start scheduler for: ${owner}`);
        }
        await ref.saveState();
    }

    /**
     * @event PolicyEventType.StopTimerEvent
     * @param {IPolicyEvent} event
     */
    @ActionCallback({
        type: PolicyInputEventType.StopTimerEvent
    })
    async stopAction(event: IPolicyEvent<any>) {
        const ref = PolicyComponentsUtils.GetBlockRef(this);
        const owner: string = event.data?.data?.owner;
        if (owner) {
            this.state[owner] = false;
            ref.log(`stop scheduler for: ${owner}`);
        }
        await ref.saveState();
    }

    public async validate(resultsContainer: PolicyValidationResultsContainer): Promise<void> {
        const ref = PolicyComponentsUtils.GetBlockRef(this);
        try {
            if (!ref.options.startDate) {
                resultsContainer.addBlockError(ref.uuid, 'Option "startDate" does not set');
            } else if (typeof ref.options.startDate !== 'string') {
                resultsContainer.addBlockError(ref.uuid, 'Option "startDate" must be a string');
            }
            if (!ref.options.period) {
                resultsContainer.addBlockError(ref.uuid, 'Option "period" does not set');
            } else if (typeof ref.options.period !== 'string') {
                resultsContainer.addBlockError(ref.uuid, 'Option "period" must be a string');
            }
        } catch (error) {
            resultsContainer.addBlockError(ref.uuid, `Unhandled exception ${error.message}`);
        }
    }
}
