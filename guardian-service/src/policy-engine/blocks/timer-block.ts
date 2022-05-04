import moment from 'moment';
import { CronJob } from 'cron';
import { BasicBlock } from '@policy-engine/helpers/decorators';
import { getMongoRepository } from 'typeorm';
import { AggregateVC } from '@entity/aggregateDocuments';
import { PolicyValidationResultsContainer } from '@policy-engine/policy-validation-results-container';
import { PolicyComponentsUtils } from '../policy-components-utils';
import { IAuthUser } from '@auth/auth.interface';
import { AnyBlockType } from '@policy-engine/policy-engine.interface';
import { Users } from '@helpers/users';
import { Inject } from '@helpers/decorators/inject';
import { StateField } from '@policy-engine/helpers/decorators';

/**
 * Aggregate block
 */
@BasicBlock({
    blockType: 'timerBlock',
    commonBlock: true
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

    start() {
        const ref = PolicyComponentsUtils.GetBlockRef<AnyBlockType>(this);
        if (ref.options.aggregateType == 'period') {
            this.startCron(ref);
        }
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

            let ed = moment(ref.options.endDate).utc();
            if (ed.isValid()) {
                this.endTime = ed.toDate().getTime();
            } else {
                this.endTime = Infinity;
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
                        ref.log(`stop scheduler`);
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
                        ref.log(`stop scheduler`);
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

    private async tickCron(ref: AnyBlockType) {
        ref.log(`tick scheduler`);

        const users = Object.keys(this.state);
        const map = [];
        for (let did of users) {
            if (this.state[did] === true) {
                map.push(did);
            }
        }

        PolicyComponentsUtils.TriggerEvent({
            type: 'TimerEvent',
            policyId: ref.policyId,
            target: ref.tag,
            targetId: ref.uuid,
            user: null,
            data: map
        })
    }

    async runAction(state: any, user: IAuthUser) {
        const ref = PolicyComponentsUtils.GetBlockRef(this);
        const owner: string = state?.data?.owner;
        if (owner) {
            this.state[owner] = true;
            ref.log(`start scheduler for: ${owner}`);
        }
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
