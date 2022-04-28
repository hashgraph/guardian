import moment from 'moment';
import { CronJob } from 'cron';
import { BasicBlock } from '@policy-engine/helpers/decorators';
import { getMongoRepository } from 'typeorm';
import { AggregateVC } from '@entity/aggregateDocuments';
import { PolicyValidationResultsContainer } from '@policy-engine/policy-validation-results-container';
import { PolicyComponentsUtils } from '../policy-components-utils';
import { IAuthUser } from '@auth/auth.interface';
import { VcDocument } from '@hedera-modules';
import { AnyBlockType } from '@policy-engine/policy-engine.interface';
import { Users } from '@helpers/users';
import { Inject } from '@helpers/decorators/inject';
import { DocumentSignature, DocumentStatus } from 'interfaces';
import { PolicyUtils } from '@policy-engine/helpers/utils';

/**
 * Aggregate block
 */
@BasicBlock({
    blockType: 'aggregateDocumentBlock',
    commonBlock: true
})
export class AggregateBlock {
    @Inject()
    private users: Users;

    private tickCount: number;
    private interval: number;
    private job: CronJob;
    private endTime: number;

    start() {
        const ref = PolicyComponentsUtils.GetBlockRef(this);
        if (ref.options.aggregateType == 'period') {
            this.startCron(ref);
        } else if (ref.options.aggregateType == 'threshold') {

        } else {

        }
    }

    destroy() {
        if (this.job) {
            this.job.stop();
        }
    }

    private startCron(ref: AnyBlockType) {
        try {
            let sd = moment(ref.options.startDate);
            if (sd.isValid()) {
                sd = moment();
            }

            let ed = moment(ref.options.endDate);
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
                });
            } else {
                this.job = new CronJob(mask, () => {
                    const now = new Date();
                    if (now.getTime() > this.endTime) {
                        ref.log(`stop scheduler`);
                        this.job.stop();
                        return;
                    }
                    this.tickCron(ref).then();
                });
            }
            this.job.start();
        } catch (error) {
            ref.log(`start scheduler fail ${error.message}`);
            throw `start scheduler fail ${error.message}`;
        }
    }

    private async tickCron(ref: AnyBlockType) {
        ref.log(`tick scheduler`);

        const repository = getMongoRepository(AggregateVC);
        const rawEntities = await repository.find({
            policyId: ref.policyId,
            blockId: ref.uuid
        });

        const map = new Map<string, AggregateVC[]>();
        for (let element of rawEntities) {
            const owner = element.owner;
            if (map.has(owner)) {
                map.get(owner).push(element);
            } else {
                map.set(owner, [element]);
            }
        }

        const owners = map.keys();
        for (let owner of owners) {
            ref.log(`aggregate next: ${owner}`);
            const user = await this.users.getUserById(owner);
            const documents = map.get(owner);
            await repository.remove(documents);
            await ref.runNext(user, { data: documents });
        }
    }

    private aggregate(rule: string, docs: AggregateVC[]) {
        let amount = 0;
        for (let i = 0; i < docs.length; i++) {
            const element = VcDocument.fromJsonTree(docs[i].document);
            const scope = PolicyUtils.getVCScope(element);
            const value = parseFloat(PolicyUtils.evaluate(rule, scope));
            amount += value;
        }
        return amount;
    }

    private async tickAggregate(ref: AnyBlockType, owner: string) {
        ref.log(`tick aggregate: ${owner}`);

        const { rule, threshold } = ref.options;

        const repository = getMongoRepository(AggregateVC);
        const rawEntities = await repository.find({
            owner: owner,
            policyId: ref.policyId,
            blockId: ref.uuid
        });

        const amount = this.aggregate(rule, rawEntities);

        if (amount >= threshold) {
            ref.log(`aggregate next: ${owner}`);
            const user = await this.users.getUserById(owner);
            await repository.remove(rawEntities);
            await ref.runNext(user, { data: rawEntities });
        }
    }

    async runAction(data: any, user: IAuthUser) {
        const ref = PolicyComponentsUtils.GetBlockRef(this);
        const { aggregateType } = ref.options;

        const doc = data.data;
        const vc = VcDocument.fromJsonTree(doc.document);
        const repository = getMongoRepository(AggregateVC);
        const newVC = repository.create({
            policyId: ref.policyId,
            blockId: ref.uuid,
            tag: doc.tag,
            type: doc.type,
            owner: doc.owner,
            assign: doc.assign,
            option: doc.option,
            schema: doc.schema,
            hederaStatus: doc.hederaStatus || DocumentStatus.NEW,
            signature: doc.signature || DocumentSignature.NEW,
            messageId: doc.messageId || null,
            topicId: doc.topicId || null,
            relationships: doc.relationships || [],
            hash: vc.toCredentialHash(),
            document: vc.toJsonTree()
        });
        await repository.save(newVC);

        if (aggregateType == 'period') {

        } else if (aggregateType == 'threshold') {
            this.tickAggregate(ref, doc.owner).then();
        } else {

        }
    }

    public async validate(resultsContainer: PolicyValidationResultsContainer): Promise<void> {
        const ref = PolicyComponentsUtils.GetBlockRef(this);
        try {
            if (ref.options.aggregateType == 'period') {
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
            } else if (ref.options.aggregateType == 'threshold') {
                if (!ref.options.rule) {
                    resultsContainer.addBlockError(ref.uuid, 'Option "rule" does not set');
                } else if (typeof ref.options.rule !== 'string') {
                    resultsContainer.addBlockError(ref.uuid, 'Option "rule" must be a string');
                }
                if (!ref.options.threshold) {
                    resultsContainer.addBlockError(ref.uuid, 'Option "threshold" does not set');
                } else if (typeof ref.options.threshold !== 'string') {
                    resultsContainer.addBlockError(ref.uuid, 'Option "threshold" must be a string');
                }
            } else {
                resultsContainer.addBlockError(ref.uuid, 'Option "aggregateType" must be one of period, threshold');
            }
        } catch (error) {
            resultsContainer.addBlockError(ref.uuid, `Unhandled exception ${error.message}`);
        }
    }
}
