import { ActionCallback, BasicBlock } from '@policy-engine/helpers/decorators';
import { AggregateVC } from '@entity/aggregate-documents';
import { PolicyComponentsUtils } from '@policy-engine/policy-components-utils';
import { VcDocument } from '@hedera-modules';
import { AnyBlockType, IPolicyDocument, IPolicyEventState } from '@policy-engine/policy-engine.interface';
import { PolicyUtils } from '@policy-engine/helpers/utils';
import { IPolicyEvent } from '@policy-engine/interfaces/policy-event';
import { PolicyInputEventType, PolicyOutputEventType } from '@policy-engine/interfaces/policy-event-type';
import ObjGet from 'lodash.get';
import { ChildrenType, ControlType, PropertyType } from '@policy-engine/interfaces/block-about';
import { ExternalDocuments, ExternalEvent, ExternalEventType } from '@policy-engine/interfaces/external-event';

/**
 * Aggregate block
 */
@BasicBlock({
    blockType: 'aggregateDocumentBlock',
    commonBlock: true,
    about: {
        label: 'Aggregate Data',
        title: `Add 'Aggregate' Block`,
        post: false,
        get: false,
        children: ChildrenType.None,
        control: ControlType.Server,
        input: [
            PolicyInputEventType.PopEvent,
            PolicyInputEventType.RunEvent,
            PolicyInputEventType.TimerEvent,
        ],
        output: [
            PolicyOutputEventType.RunEvent,
            PolicyOutputEventType.RefreshEvent
        ],
        defaultEvent: true,
        properties: [{
            name: 'groupByFields',
            label: 'Group By Fields',
            title: 'Group By Fields',
            type: PropertyType.Array,
            items: {
                label: 'Field Path',
                value: '@fieldPath',
                properties: [{
                    name: 'fieldPath',
                    label: 'Field Path',
                    title: 'Field Path',
                    type: PropertyType.Path
                }]
            }
        }]
    }
})
export class AggregateBlock {
    /**
     * Tick cron
     * @event PolicyEventType.PopEvent
     * @param {IPolicyEvent} event
     */
    @ActionCallback({
        type: PolicyInputEventType.PopEvent
    })
    public async onPopEvent(event: IPolicyEvent<IPolicyEventState>) {
        const ref = PolicyComponentsUtils.GetBlockRef(this);
        const docs: IPolicyDocument | IPolicyDocument[] = event.data.data;
        if (Array.isArray(docs)) {
            for (const doc of docs) {
                await this.popDocuments(ref, doc);
            }
        } else {
            await this.popDocuments(ref, docs);
        }
    }

    /**
     * Pop documents
     * @param ref
     * @param doc
     */
    async popDocuments(ref: AnyBlockType, doc: IPolicyDocument): Promise<void> {
        const hash = doc.hash;
        await ref.databaseServer.removeAggregateDocument(hash, ref.uuid);
    }

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
        const ids = event.data || [];

        ref.log(`tick scheduler, ${ids.length}`);

        const rawEntities = await ref.databaseServer.getAggregateDocuments(ref.policyId, ref.uuid);
        const usingFieldsGroup =
            ref.options.groupByFields && ref.options.groupByFields.length > 0;

        const map = new Map<
            string,
            AggregateVC[] | Map<string, AggregateVC[]>
        >();
        const removeMsp: AggregateVC[] = [];
        for (const id of ids) {
            map.set(
                id,
                usingFieldsGroup ? new Map<string, AggregateVC[]>() : []
            );
        }

        for (const element of rawEntities) {
            const id = PolicyUtils.getScopeId(element);
            if (map.has(id)) {
                if (usingFieldsGroup) {
                    const groupedDocuments = map.get(id) as Map<string, AggregateVC[]>;
                    const documentKey = ref.options.groupByFields
                        .map((item) =>
                            JSON.stringify(ObjGet(element, item.fieldPath))
                        )
                        .join(':');
                    if (groupedDocuments.has(documentKey)) {
                        groupedDocuments.get(documentKey).push(element);
                    } else {
                        groupedDocuments.set(documentKey, [element]);
                    }
                } else {
                    const userDocuments = map.get(id) as AggregateVC[];
                    userDocuments.push(element);
                }
            } else {
                removeMsp.push(element);
            }
        }

        if (removeMsp.length) {
            await ref.databaseServer.removeAggregateDocuments(removeMsp);
        }

        for (const id of ids) {
            if (usingFieldsGroup) {
                const groupedDocuments = map.get(id) as Map<
                    string,
                    AggregateVC[]
                >;
                for (const [, documents] of groupedDocuments) {
                    await this.sendCronDocuments(ref, id, documents);
                }
            } else {
                const documents = map.get(id) as AggregateVC[];
                await this.sendCronDocuments(ref, id, documents);
            }
        }
    }
    /**
     * Send cron documents
     * @param ref Block ref
     * @param userId User Id
     * @param documents Documents
     */
    private async sendCronDocuments(ref: AnyBlockType, userId: string, documents: AggregateVC[]) {
        if (documents.length) {
            await ref.databaseServer.removeAggregateDocuments(documents);
        }

        if (documents.length || ref.options.emptyData) {
            const state = { data: documents };
            const user = PolicyUtils.getPolicyUserById(ref, userId);
            ref.triggerEvents(PolicyOutputEventType.RunEvent, user, state);
            ref.triggerEvents(PolicyOutputEventType.RefreshEvent, user, state);
            PolicyComponentsUtils.ExternalEventFn(
                new ExternalEvent(ExternalEventType.TickCron, ref, user, {
                    documents: ExternalDocuments(documents),
                })
            );
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
     * @param document
     * @private
     */
    @ActionCallback({
        output: [PolicyOutputEventType.RunEvent, PolicyOutputEventType.RefreshEvent]
    })
    private async tickAggregate(ref: AnyBlockType, document: any) {
        const { expressions, condition } = ref.options;

        const filters: any = {};
        if (document.owner) {
            if (document.group) {
                filters.owner = document.owner;
                filters.group = document.group;
            } else {
                filters.owner = document.owner;
            }
        }
        if (ref.options.groupByFields) {
            for (const groupByField of ref.options.groupByFields) {
                filters[groupByField.fieldPath] = ObjGet(document, groupByField.fieldPath);
            }
        }

        const rawEntities = await ref.databaseServer.getAggregateDocuments(ref.policyId, ref.uuid, filters);

        const scopes: any[] = [];
        for (const doc of rawEntities) {
            scopes.push(this.expressions(ref, expressions, doc));
        }
        const scope = this.aggregateScope(scopes);
        const result = PolicyUtils.evaluateFormula(condition, scope);

        if (result === 'Incorrect formula') {
            ref.error(`tick aggregate: ${document.owner}, '${condition}' (${JSON.stringify(scope)}) = ${result}`);
        } else {
            ref.log(`tick aggregate: ${document.owner}, '${condition}' (${JSON.stringify(scope)}) = ${result}`);
        }

        if (result === true) {
            const user = PolicyUtils.getPolicyUser(ref, document.owner, document.group);
            await ref.databaseServer.removeAggregateDocuments(rawEntities);
            const state = { data: rawEntities };
            ref.triggerEvents(PolicyOutputEventType.RunEvent, user, state);
            ref.triggerEvents(PolicyOutputEventType.RefreshEvent, user, state);
            PolicyComponentsUtils.ExternalEventFn(new ExternalEvent(ExternalEventType.TickAggregate, ref, user, {
                documents: ExternalDocuments(rawEntities)
            }));
        }
    }

    /**
     * Save documents
     * @param ref
     * @param doc
     */
    async saveDocuments(ref: AnyBlockType, doc: IPolicyDocument): Promise<void> {
        const item = PolicyUtils.cloneVC(ref, doc);
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
        if (Array.isArray(docs)) {
            for (const doc of docs) {
                await this.saveDocuments(ref, doc);
                if (aggregateType === 'cumulative') {
                    await this.tickAggregate(ref, doc);
                }
            }
        } else {
            await this.saveDocuments(ref, docs);
            if (aggregateType === 'cumulative') {
                await this.tickAggregate(ref, docs);
            }
        }

        PolicyComponentsUtils.ExternalEventFn(new ExternalEvent(ExternalEventType.Run, ref, event.user, {
            documents: ExternalDocuments(docs)
        }));
    }
}
