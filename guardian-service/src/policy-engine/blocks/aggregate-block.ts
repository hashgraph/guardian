import { ActionCallback, BasicBlock } from '@policy-engine/helpers/decorators';
import { getMongoRepository } from 'typeorm';
import { AggregateVC } from '@entity/aggregateDocuments';
import { PolicyValidationResultsContainer } from '@policy-engine/policy-validation-results-container';
import { PolicyComponentsUtils } from '../policy-components-utils';
import { VcDocument } from '@hedera-modules';
import { AnyBlockType } from '@policy-engine/policy-engine.interface';
import { Users } from '@helpers/users';
import { Inject } from '@helpers/decorators/inject';
import { DocumentSignature, DocumentStatus } from '@guardian/interfaces';
import { PolicyUtils } from '@policy-engine/helpers/utils';
import { IPolicyEvent } from '@policy-engine/interfaces/policy-event';
import { PolicyInputEventType, PolicyOutputEventType } from '@policy-engine/interfaces/policy-event-type';
import { ChildrenType, ControlType } from '@policy-engine/interfaces/block-about';

/**
 * Aggregate block
 */
@BasicBlock({
    blockType: 'aggregateDocumentBlock',
    commonBlock: true,
    publishExternalEvent: true,
    about: {
        label: 'Aggregate Data',
        title: `Add 'Aggregate' Block`,
        post: false,
        get: false,
        children: ChildrenType.None,
        control: ControlType.Server,
        input: [
            PolicyInputEventType.RunEvent,
            PolicyInputEventType.TimerEvent,
        ],
        output: [
            PolicyOutputEventType.RunEvent,
            PolicyOutputEventType.RefreshEvent
        ],
        defaultEvent: true
    }
})
export class AggregateBlock {
    @Inject()
    private users: Users;

    /**
     * @event PolicyEventType.TimerEvent
     * @param {IPolicyEvent} event
     */
    @ActionCallback({
        type: PolicyInputEventType.TimerEvent,
        output: [PolicyOutputEventType.RunEvent, PolicyOutputEventType.RefreshEvent]
    })
    private async tickCron(event: IPolicyEvent<string[]>) {
        const ref = PolicyComponentsUtils.GetBlockRef(this);
        if (ref.options.aggregateType !== 'period') {
            return;
        }
        const users = event.data || [];

        ref.log(`tick scheduler, ${users.length}`);

        const repository = getMongoRepository(AggregateVC);
        const rawEntities = await repository.find({
            policyId: ref.policyId,
            blockId: ref.uuid
        });

        const map = new Map<string, AggregateVC[]>();
        const removeMsp: AggregateVC[] = [];
        for (let did of users) {
            map.set(did, []);
        }
        for (let element of rawEntities) {
            const owner = element.owner;
            if (map.has(owner)) {
                map.get(owner).push(element);
            } else {
                removeMsp.push(element);
            }
        }

        if (removeMsp.length) {
            await repository.remove(removeMsp);
        }

        for (let did of users) {
            const user = await this.users.getUserById(did);
            const documents = map.get(did);
            if (documents.length) {
                await repository.remove(documents);
            }
            if (documents.length || ref.options.emptyData) {
                const state = { data: documents };
                ref.triggerEvents(PolicyOutputEventType.RunEvent, user, state);
                ref.triggerEvents(PolicyOutputEventType.RefreshEvent, user, state);
            }
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
            result[key] = [];
        }
        for (let scope of scopes) {
            for (let key of keys) {
                result[key].push(scope[key]);
            }
        }
        return result;
    }

    @ActionCallback({
        output: [PolicyOutputEventType.RunEvent, PolicyOutputEventType.RefreshEvent]
    })
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
            const state = { data: rawEntities };
            ref.triggerEvents(PolicyOutputEventType.RunEvent, user, state);
            ref.triggerEvents(PolicyOutputEventType.RefreshEvent, user, state);
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

    /**
     * @event PolicyInputEventType.RunEvent
     * @param {IPolicyEvent} event
     */
    async runAction(event: IPolicyEvent<any>) {
        const ref = PolicyComponentsUtils.GetBlockRef(this);
        const { aggregateType } = ref.options;

        const docs: any | any[] = event.data.data;
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
                if (!ref.options.timer && !resultsContainer.isTagExist(ref.options.timer)) {
                    resultsContainer.addBlockError(ref.uuid, `Tag "${ref.options.timer}" does not exist`);
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
                            resultsContainer.addBlockError(ref.uuid, `Variable '${varName}' not defined`);
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
