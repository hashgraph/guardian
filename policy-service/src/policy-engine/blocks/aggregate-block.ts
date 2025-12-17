import { ActionCallback, BasicBlock } from '../helpers/decorators/index.js';
import { AggregateVC, VcDocumentDefinition as VcDocument } from '@guardian/common';
import { PolicyComponentsUtils } from '../policy-components-utils.js';
import { AnyBlockType, IPolicyDocument, IPolicyEventState } from '../policy-engine.interface.js';
import { PolicyUtils } from '../helpers/utils.js';
import { IPolicyEvent } from '../interfaces/policy-event.js';
import { PolicyInputEventType, PolicyOutputEventType } from '../interfaces/policy-event-type.js';
import ObjGet from 'lodash.get';
import { ChildrenType, ControlType, PropertyType } from '../interfaces/block-about.js';
import { ExternalDocuments, ExternalEvent, ExternalEventType } from '../interfaces/external-event.js';
import { LocationType } from '@guardian/interfaces';
import { RecordActionStep } from '../record-action-step.js';

/**
 * Aggregate block
 */
@BasicBlock({
    blockType: 'aggregateDocumentBlock',
    commonBlock: true,
    actionType: LocationType.REMOTE,
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
            name: 'disableUserGrouping',
            label: 'Disable user grouping',
            title: 'Disable user grouping',
            type: PropertyType.Checkbox,
            default: false
        }, {
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
    },
    variables: []
})
export class AggregateBlock {

    /**
     * Before init callback
     */
    public async beforeInit(): Promise<void> {
        const ref = PolicyComponentsUtils.GetBlockRef(this);
        const documentCacheFields =
            PolicyComponentsUtils.getDocumentCacheFields(ref.policyId);
        ref.options?.groupByFields
            ?.filter((field) => field?.fieldPath?.startsWith('document.'))
            .forEach((field) => {
                documentCacheFields.add(field.fieldPath.replace('document.', ''));
            });
    }

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
        ref.backup();
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
        const { aggregateType, groupByFields, disableUserGrouping } = ref.options;
        if (aggregateType !== 'period') {
            return;
        }
        const ids = event.data || [];

        ref.log(`tick scheduler, ${ids.length}`);

        const rawEntities = await ref.databaseServer.getAggregateDocuments(ref.policyId, ref.uuid);
        const groupByUser = !disableUserGrouping;

        const map = new Map<string, AggregateVC[]>();
        let removeMsp: AggregateVC[] = [];

        for (const element of rawEntities) {
            const id = PolicyUtils.getScopeId(element);
            if (groupByUser && !ids.includes(id)) {
                removeMsp.push(element);
                continue;
            }
            if (!groupByUser || groupByFields?.length > 0) {
                const documentKey = groupByFields
                    .map((item) =>
                        JSON.stringify(ObjGet(element, item.fieldPath))
                    )
                    .join('|');
                const key = groupByUser ? `${id}|${documentKey}` : documentKey;
                if (map.has(key)) {
                    map.get(key).push(element);
                } else {
                    map.set(key, [element]);
                }
            } else {
                if (map.has(id)) {
                    map.get(id).push(element);
                } else {
                    map.set(id, [element]);
                }
            }
        }

        removeMsp = await this.removeDocuments(ref, removeMsp);

        for (const [key, documents] of map) {
            await this.sendCronDocuments(
                ref,
                groupByUser ? key.split('|')[0] : ref.policyOwner,
                documents,
                event.actionStatus
            );
        }
        ref.backup();
    }
    /**
     * Send cron documents
     * @param ref Block ref
     * @param userId User Id
     * @param documents Documents
     */
    private async sendCronDocuments(ref: AnyBlockType, userId: string, documents: AggregateVC[], actionStatus: RecordActionStep) {
        documents = await this.removeDocuments(ref, documents);
        if (documents.length || ref.options.emptyData) {
            const state: IPolicyEventState = { data: documents };
            const user = await PolicyUtils.getPolicyUserById(ref, userId);
            ref.triggerEvents(PolicyOutputEventType.RunEvent, user, state, actionStatus);
            ref.triggerEvents(PolicyOutputEventType.RefreshEvent, user, state, actionStatus);
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
     * @param userId
     * @private
     */
    @ActionCallback({
        output: [PolicyOutputEventType.RunEvent, PolicyOutputEventType.RefreshEvent]
    })
    private async tickAggregate(ref: AnyBlockType, document: any, userId: string | null, actionStatus: RecordActionStep) {
        const { expressions, condition, disableUserGrouping, groupByFields } = ref.options;
        const groupByUser = !disableUserGrouping;

        const filters: any = {};
        if (document.owner && groupByUser) {
            if (document.group) {
                filters.owner = document.owner;
                filters.group = document.group;
            } else {
                filters.owner = document.owner;
            }
        }
        if (groupByFields) {
            for (const groupByField of groupByFields) {
                filters[groupByField.fieldPath] = ObjGet(document, groupByField.fieldPath);
            }
        }

        let rawEntities = await ref.databaseServer.getAggregateDocuments(ref.policyId, ref.uuid, filters);

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
            const user = await PolicyUtils.getDocumentOwner(ref, document, userId);
            rawEntities = await this.removeDocuments(ref, rawEntities);
            const state: IPolicyEventState = { data: rawEntities };
            ref.triggerEvents(PolicyOutputEventType.RunEvent, user, state, actionStatus);
            ref.triggerEvents(PolicyOutputEventType.RefreshEvent, user, state, actionStatus);
            PolicyComponentsUtils.ExternalEventFn(new ExternalEvent(ExternalEventType.TickAggregate, ref, user, {
                documents: ExternalDocuments(rawEntities)
            }));
        }
        ref.backup();
    }

    /**
     * Save documents
     * @param ref
     * @param doc
     */
    private async saveDocuments(
        ref: AnyBlockType,
        doc: IPolicyDocument
    ): Promise<void> {
        const item: any = PolicyUtils.cloneVC(ref, doc);
        item.sourceDocumentId = item._id;
        delete item._id;
        delete item.id;
        await ref.databaseServer.createAggregateDocuments(item, ref.uuid);
    }

    /**
     * Remove documents
     * @param ref
     * @param documents
     */
    private async removeDocuments(
        ref: AnyBlockType,
        documents: AggregateVC[]
    ): Promise<AggregateVC[]> {
        if (documents.length) {
            await ref.databaseServer.removeAggregateDocuments(documents);
            documents
                .filter((document) => document.sourceDocumentId)
                .forEach((document: any) => {
                    document._id = document.sourceDocumentId;
                    document.id = document.sourceDocumentId.toString();
                    delete document.sourceDocumentId;
                });
        }
        return documents;
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
                    await this.tickAggregate(ref, doc, event?.user?.userId, event.actionStatus);
                }
            }
        } else {
            await this.saveDocuments(ref, docs);
            if (aggregateType === 'cumulative') {
                await this.tickAggregate(ref, docs, event?.user?.userId, event.actionStatus);
            }
        }

        PolicyComponentsUtils.ExternalEventFn(new ExternalEvent(ExternalEventType.Run, ref, event.user, {
            documents: ExternalDocuments(docs)
        }));
    }
}
