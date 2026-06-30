import { BlockActionError } from '../errors/index.js';
import { ActionCallback, ValidatorBlock } from '../helpers/decorators/index.js';
import { CatchErrors } from '../helpers/decorators/catch-errors.js';
import { IPolicyEvent, PolicyInputEventType, PolicyOutputEventType } from '../interfaces/index.js';
import { ChildrenType, ControlType } from '../interfaces/block-about.js';
import { AnyBlockType, IPolicyDocument, IPolicyEventState, IPolicyValidatorBlock } from '../policy-engine.interface.js';
import { PolicyComponentsUtils } from '../policy-components-utils.js';
import { PolicyUtils } from '../helpers/utils.js';
import { ExternalDocuments, ExternalEvent, ExternalEventType } from '../interfaces/external-event.js';
import { FilterQuery } from '@mikro-orm/core';
import { VcDocument, VpDocument } from '@guardian/common';
import { LocationType } from '@guardian/interfaces';

/**
 * Document Validator
 */
@ValidatorBlock({
    blockType: 'documentValidatorBlock',
    commonBlock: false,
    actionType: LocationType.LOCAL,
    canMock: false,
    about: {
        label: 'Validator',
        title: `Add 'Validator' Block`,
        post: false,
        get: false,
        children: ChildrenType.None,
        control: ControlType.Special,
        input: [
            PolicyInputEventType.RunEvent
        ],
        output: [
            PolicyOutputEventType.RunEvent,
            PolicyOutputEventType.RefreshEvent,
            PolicyOutputEventType.ErrorEvent
        ],
        defaultEvent: true
    },
    variables: [
        { path: 'options.schema', alias: 'schema', type: 'Schema' }
    ]
})
export class DocumentValidatorBlock {
    private coerceValue(value: any): any {
        if (typeof value !== 'string') { return value; }
        if (value === 'null') { return null; }
        if (value === 'true') { return true; }
        if (value === 'false') { return false; }
        const num = Number(value);
        if (!isNaN(num) && value.trim() !== '') { return num; }
        const d = new Date(value);
        if (!isNaN(d.getTime())) { return d.getTime(); }
        return value;
    }

    private resolveDocumentValue(path: string, document: IPolicyDocument): any {
        return PolicyUtils.getObjectValue(document, path);
    }

    private resolveSourceValue(path: string, sourceDocuments: any[], operator: string): any {
        if (operator === 'in' || operator === 'not_in') {
            return sourceDocuments.map((doc) => PolicyUtils.getObjectValue(doc, path)).flat();
        }
        return PolicyUtils.getObjectValue(sourceDocuments[0], path);
    }

    private resolveConditionSide(
        raw: string,
        sourceType: 'value' | 'document' | 'source',
        operator: string,
        document: IPolicyDocument,
        sourceDocuments: any[]
    ): any {
        switch (sourceType) {
            case 'document': return this.resolveDocumentValue(raw, document);
            case 'source':   return this.resolveSourceValue(raw, sourceDocuments, operator);
            default:         return raw;
        }
    }

    private evaluateCrossCondition(left: any, type: string, right: any): boolean {
        switch (type) {
            case 'not_equal': return left !== right;
            case 'in':
                if (Array.isArray(right)) { return right.includes(left); }
                if (Array.isArray(left)) { return left.includes(right); }
                return String(right).split(',').map((v: string) => v.trim()).includes(String(left));
            case 'not_in':
                if (Array.isArray(right)) { return !right.includes(left); }
                if (Array.isArray(left)) { return !left.includes(right); }
                return !String(right).split(',').map((v: string) => v.trim()).includes(String(left));
            case 'gt':        return left > right;
            case 'gte':       return left >= right;
            case 'lt':        return left < right;
            case 'lte':       return left <= right;
            default:          return left === right;
        }
    }

    private describeCrossConditionFailure(type: string, left: any, right: any): string {
        const l = JSON.stringify(left);
        const r = JSON.stringify(right);
        switch (type) {
            case 'not_equal': return `value ${l} must not equal ${r}`;
            case 'in':        return `value ${l} is not in ${r}`;
            case 'not_in':    return `value ${l} must not be in ${r}`;
            case 'gt':        return `value ${l} is not greater than ${r}`;
            case 'gte':       return `value ${l} is not greater than or equal to ${r}`;
            case 'lt':        return `value ${l} is not less than ${r}`;
            case 'lte':       return `value ${l} is not less than or equal to ${r}`;
            default:          return `got ${l}, expected ${r}`;
        }
    }

    private buildSourceHint(detail: string, matched: number, total: number): string {
        if (matched === total) { return 'Matches all sources - not blocking'; }
        const m = detail.match(/^value (.+?) (?:is|must)/) ?? detail.match(/^got (.+?),/);
        const raw = m ? m[1].replace(/^"|"$/g, '') : null;
        const val = raw !== null ? `"${raw}"` : null;
        if (matched === 0) {
            return val ? `${val} not found in any source` : 'Not found in any source';
        }
        return val ? `${val} valid in some sources` : 'Valid in some sources';
    }

    private buildSourceFilter(
        sourceValidation: any,
        ref: IPolicyValidatorBlock,
        document: IPolicyDocument,
        user: any
    ): Record<string, any> {
        const filter: Record<string, any> = { policyId: { $eq: ref.policyId } };

        if (sourceValidation.schema) {
            filter.schema = { $eq: sourceValidation.schema };
        }
        if (sourceValidation.onlyOwnDocuments && user?.did) {
            filter.owner = { $eq: user.did };
        }
        if (sourceValidation.onlyOwnByGroupDocuments && user?.group) {
            filter.group = { $eq: user.group };
        }
        if (sourceValidation.onlyAssignDocuments && user?.did) {
            filter.assignedTo = { $eq: user.did };
        }
        if (sourceValidation.onlyAssignByGroupDocuments && user?.group) {
            filter.assignedToGroup = { $eq: user.group };
        }

        for (const f of (sourceValidation.filters || [])) {
            const raw = f.typeValue === 'variable'
                ? this.resolveDocumentValue(f.value, document)
                : f.value;
            const value = this.coerceValue(raw);

            switch (f.type) {
                case 'not_equal': filter[f.field] = { $ne: value }; break;
                case 'in': {
                    const arr = f.typeValue === 'variable'
                        ? (Array.isArray(raw) ? raw.map((e: any) => this.coerceValue(e)) : [value])
                        : String(f.value).split(',').map((v: string) => this.coerceValue(v.trim()));
                    filter[f.field] = { $in: arr };
                    break;
                }
                case 'not_in': {
                    const arr = f.typeValue === 'variable'
                        ? (Array.isArray(raw) ? raw.map((e: any) => this.coerceValue(e)) : [value])
                        : String(f.value).split(',').map((v: string) => this.coerceValue(v.trim()));
                    filter[f.field] = { $nin: arr };
                    break;
                }
                case 'gt':        filter[f.field] = { $gt: value }; break;
                case 'gte':       filter[f.field] = { $gte: value }; break;
                case 'lt':        filter[f.field] = { $lt: value }; break;
                case 'lte':       filter[f.field] = { $lte: value }; break;
                default:          filter[f.field] = { $eq: value }; break;
            }
        }

        return filter;
    }

    private async runSourceValidation(
        ref: IPolicyValidatorBlock,
        sourceValidation: any,
        document: IPolicyDocument,
        user: any
    ): Promise<string | null> {
        const filter = this.buildSourceFilter(sourceValidation, ref, document, user);

        const sourceDocuments: any[] = sourceValidation.dbCollection === 'VpDocument'
            ? await ref.databaseServer.getVpDocuments(filter as any) as any[]
            : await ref.databaseServer.getVcDocuments(filter as any) as any[];

        const title = sourceValidation.failMessage || ref.tag;

        if (!sourceDocuments?.length) {
            const filterSummary = (sourceValidation.filters || [])
                .map((f: any) => {
                    const v = f.typeValue === 'variable'
                        ? this.resolveDocumentValue(f.value, document)
                        : f.value;
                    return `${f.field} ${f.type} ${JSON.stringify(v)}`;
                })
                .join(', ');
            const detail = filterSummary
                ? `no source documents matched filter(s): ${filterSummary}`
                : 'no matching source documents found';
            return `${title}: ${detail}`;
        }

        const conditions = sourceValidation.conditions || [];
        if (!conditions.length) {
            return null;
        }

        const failureMap = new Map<string, { field: string, detail: string, count: number }>();
        for (const sourceDoc of sourceDocuments) {
            let failed = false;
            const counted = new Set<string>();
            for (const condition of conditions) {
                const coerceDeep = (v: any) => Array.isArray(v) ? v.map((e: any) => this.coerceValue(e)) : this.coerceValue(v);
                const left  = coerceDeep(this.resolveConditionSide(condition.field, condition.fieldSource, condition.type, document, [sourceDoc]));
                const right = coerceDeep(this.resolveConditionSide(condition.value, condition.valueSource, condition.type, document, [sourceDoc]));
                if (!this.evaluateCrossCondition(left, condition.type, right)) {
                    if (!failureMap.has(condition.field)) {
                        failureMap.set(condition.field, { field: condition.field, detail: this.describeCrossConditionFailure(condition.type, left, right), count: 0 });
                    }
                    if (!counted.has(condition.field)) {
                        failureMap.get(condition.field).count++;
                        counted.add(condition.field);
                    }
                    failed = true;
                }
            }
            if (!failed) {
                return null;
            }
        }

        const total = sourceDocuments.length;
        const schema = sourceValidation.schema
            ? await PolicyUtils.loadSchemaByID(ref, sourceValidation.schema)
            : null;
        const schemaName = schema?.name ?? null;

        const N = failureMap.size;
        let msg = `Checked ${N} field${N !== 1 ? 's' : ''} across ${total} source${total !== 1 ? 's' : ''}`;
        for (const { field, detail, count } of Array.from(failureMap.values())) {
            const matched = total - count;
            const rawLabel = field.split('.').filter(p => p !== 'document' && !/^\d+$/.test(p)).pop() || field;
            const label = schemaName ? `${schemaName} · ${rawLabel}` : rawLabel;
            const hint = this.buildSourceHint(detail, matched, total);
            msg += `\n\n${label}\n(${hint})`;
        }
        return msg;
    }

    /**
     * Before init callback
     */
    public async beforeInit(): Promise<void> {
        const ref = PolicyComponentsUtils.GetBlockRef<AnyBlockType>(this);
        const documentCacheFields = PolicyComponentsUtils.getDocumentCacheFields(ref.policyId);
        if (ref.options?.documentType === 'related-vc-document') {
            documentCacheFields.add('credentialSubject.0.id');
        }
        if (ref.options?.documentType === 'related-vp-document') {
            documentCacheFields.add('verifiableCredential.credentialSubject.0.id');
        }
    }

    /**
     * Validate Document
     * @param ref
     * @param event
     * @param document
     */
    private async validateDocument(
        ref: IPolicyValidatorBlock,
        event: IPolicyEvent<IPolicyEventState>,
        document: IPolicyDocument
    ): Promise<string> {
        if (!document) {
            return `Invalid document`;
        }

        const documentRef = PolicyUtils.getDocumentRef(document);

        const options = await ref.getOptions(event.user);

        if (options.documentType === 'related-vc-document') {
            if (documentRef) {
                document = await ref.databaseServer.getVcDocument({
                    'policyId': { $eq: ref.policyId },
                    'document.credentialSubject.id': { $eq: documentRef }
                } as FilterQuery<VcDocument>);
            } else {
                document = null;
            }
        }

        if (options.documentType === 'related-vp-document') {
            if (documentRef) {
                document = await ref.databaseServer.getVpDocument({
                    'policyId': ref.policyId,
                    'document.verifiableCredential.credentialSubject.id': { $eq: documentRef }
                } as FilterQuery<VpDocument>);
            } else {
                document = null;
            }
        }

        if (!document) {
            return `Document does not exist`;
        }

        const documentType = PolicyUtils.getDocumentType(document);

        if (options.documentType === 'vc-document') {
            if (documentType !== 'VerifiableCredential') {
                return `Invalid document type`;
            }
        } else if (options.documentType === 'vp-document') {
            if (documentType !== 'VerifiablePresentation') {
                return `Invalid document type`;
            }
        } else if (options.documentType === 'related-vc-document') {
            if (documentType !== 'VerifiableCredential') {
                return `Invalid document type`;
            }
        } else if (options.documentType === 'related-vp-document') {
            if (documentType !== 'VerifiablePresentation') {
                return `Invalid document type`;
            }
        }

        const userDID = event?.user?.did;
        const userGroup = event?.user?.group;

        if (options.checkOwnerDocument) {
            if (document.owner !== userDID) {
                return `Invalid owner`;
            }
        }
        if (options.checkOwnerByGroupDocument) {
            if (document.group !== userGroup) {
                return `Invalid group`;
            }
        }
        if (options.checkAssignDocument) {
            if (document.assignedTo !== userDID) {
                return `Invalid assigned user`;
            }
        }
        if (options.checkAssignByGroupDocument) {
            if (document.assignedToGroup !== userGroup) {
                return `Invalid assigned group`;
            }
        }

        if (options.schema) {
            const schema = await PolicyUtils.loadSchemaByID(ref, options.schema);
            if (!PolicyUtils.checkDocumentSchema(ref, document, schema)) {
                return `Invalid document schema`;
            }
        }

        if (options.conditions) {
            for (const filter of options.conditions) {
                if (!PolicyUtils.checkDocumentField(document, filter)) {
                    const actual = PolicyUtils.getObjectValue(document, filter.field);
                    const label = String(filter.field).split('.').filter((p: string) => p !== 'document' && !/^\d+$/.test(p)).pop() || filter.field;
                    return `Field "${label}": ${this.describeCrossConditionFailure(filter.type, actual, filter.value)}`;
                }
            }
        }

        if (options.sourceValidations?.length) {
            for (const sourceValidation of options.sourceValidations) {
                const error = await this.runSourceValidation(ref, sourceValidation, document, event.user);
                if (error) {
                    return error;
                }
            }
        }

        return null;
    }

    /**
     * Run block logic
     * @param event
     */
    public async run(event: IPolicyEvent<IPolicyEventState>): Promise<string> {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyValidatorBlock>(this);

        const document = event?.data?.data;

        if (!document) {
            return `Invalid document`;
        }

        if (Array.isArray(document)) {
            for (const doc of document) {
                const error = await this.validateDocument(ref, event, doc);
                if (error) {
                    return error;
                }
            }
            return null;
        } else {
            return await this.validateDocument(ref, event, document);
        }
    }

    /**
     * Run block action
     * @event PolicyEventType.Run
     * @param {IPolicyEvent} event
     */
    @ActionCallback({
        output: [
            PolicyOutputEventType.RunEvent,
            PolicyOutputEventType.RefreshEvent,
            PolicyOutputEventType.ErrorEvent
        ]
    })
    @CatchErrors()
    async runAction(event: IPolicyEvent<IPolicyEventState>): Promise<any> {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyValidatorBlock>(this);
        ref.log(`runAction`);

        const error = await ref.run(event);
        if (error) {
            throw new BlockActionError(error, ref.blockType, ref.uuid);
        }
        // event.actionStatus.saveResult(event.data);

        await ref.triggerEvents(PolicyOutputEventType.RunEvent, event.user, event.data, event.actionStatus);
        await ref.triggerEvents(PolicyOutputEventType.ReleaseEvent, event.user, null, event.actionStatus);
        await ref.triggerEvents(PolicyOutputEventType.RefreshEvent, event.user, event.data, event.actionStatus);
        PolicyComponentsUtils.ExternalEventFn(new ExternalEvent(ExternalEventType.Run, ref, event?.user, {
            documents: ExternalDocuments(event?.data?.data)
        }));
        ref.backup();

        return event.data;
    }
}
