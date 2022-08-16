import { ActionCallback, BasicBlock } from '@policy-engine/helpers/decorators';
import { AggregateVC } from '@entity/aggregate-documents';
import { PolicyValidationResultsContainer } from '@policy-engine/policy-validation-results-container';
import { PolicyComponentsUtils } from '@policy-engine/policy-components-utils';
import { VcDocument } from '@hedera-modules';
import { AnyBlockType, IPolicyDocument, IPolicyEventState, IPolicyState } from '@policy-engine/policy-engine.interface';
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
    /**
     * Tick cron
     * @event PolicyEventType.TimerEvent
     * @param {IPolicyEvent} event
     */
    @ActionCallback({
        type: PolicyInputEventType.TimerEvent,
        output: [PolicyOutputEventType.RunEvent, PolicyOutputEventType.RefreshEvent]
    })
    public async tickCron(event: IPolicyEvent<string[]>) {
        const ref = PolicyComponentsUtils.GetBlockRef(this);
        if (ref.options.aggregateType !== 'period') {
            return;
        }
        const users = event.data || [];

        ref.log(`tick scheduler, ${users.length}`);

        const rawEntities = await ref.databaseServer.getAggregateDocuments(ref.policyId, ref.uuid);

        const map = new Map<string, AggregateVC[]>();
        const removeMsp: AggregateVC[] = [];
        for (const did of users) {
            map.set(did, []);
        }
        for (const element of rawEntities) {
            const owner = element.owner;
            if (map.has(owner)) {
                map.get(owner).push(element);
            } else {
                removeMsp.push(element);
            }
        }

        if (removeMsp.length) {
            await ref.databaseServer.removeAggregateDocuments(removeMsp);
        }

        for (const did of users) {
            const user = await PolicyUtils.getPolicyUser(ref, did);
            const documents = map.get(did);
            if (documents.length) {
                await ref.databaseServer.removeAggregateDocuments(documents);
            }
            if (documents.length || ref.options.emptyData) {
                const state = { data: documents };
                ref.triggerEvents(PolicyOutputEventType.RunEvent, user, state);
                ref.triggerEvents(PolicyOutputEventType.RefreshEvent, user, state);
            }
        }
    }

    /**
     * Calculate expressions
     * @param expressions
     * @param doc
     * @private
     */
    private expressions(ref: AnyBlockType, expressions: any[], doc: AggregateVC): any {
        const result: any = {};
        if (!expressions || !expressions.length) {
            return result;
        }
        const element = VcDocument.fromJsonTree(doc.document);
        const scope = PolicyUtils.getVCScope(element);
        for (const expression of expressions) {
            const formulaResult = PolicyUtils.evaluateFormula(expression.value, scope);
            if (formulaResult === 'Incorrect formula') {
                ref.error(`expression: ${expression.value}, ${formulaResult}, ${JSON.stringify(scope)}`);
            }
            result[expression.name] = parseFloat(formulaResult);
        }
        return result;
    }

    /**
     * Aggregate scope
     * @param scopes
     * @private
     */
    private aggregateScope(scopes: any[]): any {
        const result: any = {};
        if (!scopes || !scopes.length) {
            return result;
        }
        const keys = Object.keys(scopes[0]);
        for (const key of keys) {
            result[key] = [];
        }
        for (const scope of scopes) {
            for (const key of keys) {
                result[key].push(scope[key]);
            }
        }
        return result;
    }

    /**
     * Tick aggregate
     * @param ref
     * @param owner
     * @private
     */
    @ActionCallback({
        output: [PolicyOutputEventType.RunEvent, PolicyOutputEventType.RefreshEvent]
    })
    private async tickAggregate(ref: AnyBlockType, owner: string) {
        const { expressions, condition } = ref.options;

        const rawEntities = await ref.databaseServer.getAggregateDocuments(ref.policyId, ref.uuid, owner);

        const scopes: any[] = [];
        for (const doc of rawEntities) {
            scopes.push(this.expressions(ref, expressions, doc));
        }
        const scope = this.aggregateScope(scopes);
        const result = PolicyUtils.evaluateFormula(condition, scope);

        if (result === 'Incorrect formula') {
            ref.error(`tick aggregate: ${owner}, '${condition}' (${JSON.stringify(scope)}) = ${result}`);
        } else {
            ref.log(`tick aggregate: ${owner}, '${condition}' (${JSON.stringify(scope)}) = ${result}`);
        }

        if (result === true) {
            const user = await PolicyUtils.getPolicyUser(ref, owner);
            await ref.databaseServer.removeAggregateDocuments(rawEntities);
            const state = { data: rawEntities };
            ref.triggerEvents(PolicyOutputEventType.RunEvent, user, state);
            ref.triggerEvents(PolicyOutputEventType.RefreshEvent, user, state);
        }
    }

    /**
     * Save documents
     * @param ref
     * @param doc
     */
    async saveDocuments(ref: AnyBlockType, doc: IPolicyDocument): Promise<void> {
        const vc = VcDocument.fromJsonTree(doc.document);

        const item = ref.databaseServer.createVCRecord(
            ref.policyId,
            null,
            null,
            vc,
            doc
        );

        await ref.databaseServer.createAggregateDocuments(item, ref.uuid);
    }

    /**
     * Run action callback
     * @event PolicyInputEventType.RunEvent
     * @param {IPolicyEvent} event
     */
    async runAction(event: IPolicyEvent<IPolicyEventState>) {
        const ref = PolicyComponentsUtils.GetBlockRef(this);
        const { aggregateType } = ref.options;

        const docs: IPolicyDocument | IPolicyDocument[] = event.data.data;
        let owner: string = null;
        if (Array.isArray(docs)) {
            for (const doc of docs) {
                owner = doc.owner;
                await this.saveDocuments(ref, doc);
            }
        } else {
            owner = docs.owner;
            await this.saveDocuments(ref, docs);
        }

        if (aggregateType === 'cumulative') {
            this.tickAggregate(ref, owner).then();
        }
    }

    /**
     * Validate block options
     * @param resultsContainer
     */
    public async validate(resultsContainer: PolicyValidationResultsContainer): Promise<void> {
        const ref = PolicyComponentsUtils.GetBlockRef(this);
        try {
            if (ref.options.aggregateType === 'period') {
                if (!ref.options.timer && !resultsContainer.isTagExist(ref.options.timer)) {
                    resultsContainer.addBlockError(ref.uuid, `Tag "${ref.options.timer}" does not exist`);
                }
            } else if (ref.options.aggregateType === 'cumulative') {
                const variables: any = {};
                if (ref.options.expressions) {
                    for (const expression of ref.options.expressions) {
                        variables[expression.name] = true;
                    }
                }
                if (!ref.options.condition) {
                    resultsContainer.addBlockError(ref.uuid, 'Option "condition" does not set');
                } else if (typeof ref.options.condition !== 'string') {
                    resultsContainer.addBlockError(ref.uuid, 'Option "condition" must be a string');
                } else {
                    const vars = PolicyUtils.variables(ref.options.condition);
                    for (const varName of vars) {
                        if (!variables[varName]) {
                            resultsContainer.addBlockError(ref.uuid, `Variable '${varName}' not defined`);
                        }
                    }
                }
            } else {
                resultsContainer.addBlockError(ref.uuid, 'Option "aggregateType" must be one of period, cumulative');
            }
        } catch (error) {
            resultsContainer.addBlockError(ref.uuid, `Unhandled exception ${PolicyUtils.getErrorMessage(error)}`);
        }
    }
}
