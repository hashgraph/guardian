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

    private expressions(expressions: any[], doc: AggregateVC): any {
        const result: any = {};
        if (!expressions || !expressions.length) {
            return result;
        }
        const element = VcDocument.fromJsonTree(doc.document);
        const scope = PolicyUtils.getVCScope(element);
        for (let i = 0; i < expressions.length; i++) {
            const expression = expressions[i];
            result[expression.name] = parseFloat(PolicyUtils.evaluate(expression.value, scope));
        }
        return result;
    }

    private aggregateScope(scopes: any[]): any {
        const result: any = {};
        if (!scopes || !scopes.length) {
            return result;
        }
        const keys = Object.keys(scopes[0]);
        for (let key of keys) {
            result[key] = 0;
        }
        for (let scope of scopes) {
            for (let key of keys) {
                result[key] = result[key] + scope[key];
            }
        }
        return result;
    }

    private async tickAggregate(ref: AnyBlockType, owner: string) {
        const { expressions, condition } = ref.options;

        const repository = getMongoRepository(AggregateVC);
        const rawEntities = await repository.find({
            owner: owner,
            policyId: ref.policyId,
            blockId: ref.uuid
        });

        const scopes: any[] = [];
        for (let doc of rawEntities) {
            const scope = this.expressions(expressions, doc);
            scopes.push(scope);
        }
        const scope = this.aggregateScope(scopes);
        const result = PolicyUtils.evaluate(condition, scope);

        ref.log(`tick aggregate: ${owner}, ${result}, ${JSON.stringify(scope)}`);

        if (result === true) {
            const user = await this.users.getUserById(owner);
            await repository.remove(rawEntities);
            await ref.runNext(user, { data: rawEntities });
        }
    }

    async saveDocuments(ref: AnyBlockType, doc: any): Promise<void> {
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
    }

    async runAction(state: any, user: IAuthUser) {
        const ref = PolicyComponentsUtils.GetBlockRef(this);
        const { aggregateType } = ref.options;

        const docs: any | any[] = state.data;
        let owner: string = null;
        if (Array.isArray(docs)) {
            for (let doc of docs) {
                owner = doc.owner;
                await this.saveDocuments(ref, doc);
            }
        } else {
            owner = docs.owner;
            await this.saveDocuments(ref, docs);
        }

        if (aggregateType == 'cumulative') {
            this.tickAggregate(ref, owner).then();
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
            } else if (ref.options.aggregateType == 'cumulative') {
                let variables: any = {};
                if (ref.options.expressions) {
                    for (let i = 0; i < ref.options.expressions.length; i++) {
                        const expression = ref.options.expressions[i];
                        variables[expression.name] = true;
                    }
                }
                if (!ref.options.condition) {
                    resultsContainer.addBlockError(ref.uuid, 'Option "condition" does not set');
                } else if (typeof ref.options.condition !== 'string') {
                    resultsContainer.addBlockError(ref.uuid, 'Option "condition" must be a string');
                } else {
                    const vars = PolicyUtils.variables(ref.options.condition);
                    for (let i = 0; i < vars.length; i++) {
                        const varName = vars[i];
                        if (!variables[varName]) {
                            resultsContainer.addBlockError(ref.uuid, `Variable ${varName} not defined`);
                        }
                    }
                }
            } else {
                resultsContainer.addBlockError(ref.uuid, 'Option "aggregateType" must be one of period, cumulative');
            }
        } catch (error) {
            resultsContainer.addBlockError(ref.uuid, `Unhandled exception ${error.message}`);
        }
    }
}
