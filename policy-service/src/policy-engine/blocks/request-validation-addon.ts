import { LocationType } from '@guardian/interfaces';
import { ActionCallback, ValidatorBlock } from '../helpers/decorators/index.js';
import { CatchErrors } from '../helpers/decorators/catch-errors.js';
import { findOptions } from '../helpers/find-options.js';
import { PolicyComponentsUtils } from '../policy-components-utils.js';
import { BlockActionError } from '../errors/index.js';
import { ChildrenType, ControlType, PropertyType } from '../interfaces/block-about.js';
import { IPolicyEvent, PolicyInputEventType, PolicyOutputEventType } from '../interfaces/index.js';
import { IPolicyDocument, IPolicyEventState, IPolicyValidatorBlock } from '../policy-engine.interface.js';
import { ExternalDocuments, ExternalEvent, ExternalEventType } from '../interfaces/external-event.js';

/**
 * Request Validation Addon
 * Server-side validator for requestVcDocumentBlockAddon.
 * Finds source documents by configured filters and validates
 * the submitted document against them using field conditions.
 */
@ValidatorBlock({
    blockType: 'requestValidationAddon',
    commonBlock: false,
    actionType: LocationType.LOCAL,
    canMock: false,
    about: {
        label: 'Request Validation',
        title: `Add 'Request Validation' Addon`,
        post: false,
        get: false,
        children: ChildrenType.None,
        control: ControlType.Special,
        input: [
            PolicyInputEventType.RunEvent,
        ],
        output: [
            PolicyOutputEventType.RunEvent,
            PolicyOutputEventType.RefreshEvent,
            PolicyOutputEventType.ErrorEvent,
        ],
        defaultEvent: false,
        properties: [
            {
                name: 'validations',
                label: 'Validations',
                title: 'Validations',
                type: PropertyType.Array,
                editable: true,
                items: {
                    label: 'Validation',
                    value: '',
                    properties: [
                        {
                            name: 'dbCollection',
                            label: 'Source Collection',
                            title: 'Source Collection',
                            type: PropertyType.Select,
                            editable: true,
                            items: [
                                { label: 'VC Document', value: 'VcDocument' },
                                { label: 'VP Document', value: 'VpDocument' },
                            ],
                            default: 'VcDocument',
                        },
                        {
                            name: 'filters',
                            label: 'Source Filters',
                            title: 'Source Filters',
                            type: PropertyType.Array,
                            editable: true,
                            items: {
                                label: 'Filter',
                                value: '',
                                properties: [
                                    {
                                        name: 'field',
                                        label: 'Field',
                                        title: 'Field',
                                        type: PropertyType.Input,
                                        editable: true,
                                    },
                                    {
                                        name: 'type',
                                        label: 'Operator',
                                        title: 'Operator',
                                        type: PropertyType.Select,
                                        editable: true,
                                        items: [
                                            { label: 'Equal', value: 'equal' },
                                            { label: 'Not Equal', value: 'not_equal' },
                                            { label: 'In', value: 'in' },
                                            { label: 'Not In', value: 'not_in' },
                                        ],
                                        default: 'equal',
                                    },
                                    {
                                        name: 'typeValue',
                                        label: 'Value Type',
                                        title: 'Value Type',
                                        type: PropertyType.Select,
                                        editable: true,
                                        items: [
                                            { label: 'Value', value: 'value' },
                                            { label: 'Variable', value: 'variable' },
                                        ],
                                        default: 'value',
                                    },
                                    {
                                        name: 'value',
                                        label: 'Value',
                                        title: 'Value',
                                        type: PropertyType.Input,
                                        editable: true,
                                    },
                                ],
                            },
                        },
                        {
                            name: 'conditions',
                            label: 'Conditions',
                            title: 'Conditions',
                            type: PropertyType.Array,
                            editable: true,
                            items: {
                                label: 'Condition',
                                value: '',
                                properties: [
                                    {
                                        name: 'field',
                                        label: 'Left Value',
                                        title: 'Left Value',
                                        type: PropertyType.Input,
                                        editable: true,
                                    },
                                    {
                                        name: 'fieldSource',
                                        label: 'Left Value Type',
                                        title: 'Left Value Type',
                                        type: PropertyType.Select,
                                        editable: true,
                                        items: [
                                            { label: 'Value', value: 'value' },
                                            { label: 'Input Document', value: 'document' },
                                            { label: 'Source Document', value: 'source' },
                                        ],
                                        default: 'document',
                                    },
                                    {
                                        name: 'type',
                                        label: 'Operator',
                                        title: 'Operator',
                                        type: PropertyType.Select,
                                        editable: true,
                                        items: [
                                            { label: 'Equal', value: 'equal' },
                                            { label: 'Not Equal', value: 'not_equal' },
                                            { label: 'In', value: 'in' },
                                            { label: 'Not In', value: 'not_in' },
                                            { label: 'Greater Than', value: 'gt' },
                                            { label: 'Less Than', value: 'lt' },
                                        ],
                                        default: 'equal',
                                    },
                                    {
                                        name: 'value',
                                        label: 'Right Value',
                                        title: 'Right Value',
                                        type: PropertyType.Input,
                                        editable: true,
                                    },
                                    {
                                        name: 'valueSource',
                                        label: 'Right Value Type',
                                        title: 'Right Value Type',
                                        type: PropertyType.Select,
                                        editable: true,
                                        items: [
                                            { label: 'Value', value: 'value' },
                                            { label: 'Input Document', value: 'document' },
                                            { label: 'Source Document', value: 'source' },
                                        ],
                                        default: 'source',
                                    },
                                ],
                            },
                        },
                        {
                            name: 'failMessage',
                            label: 'Fail Message',
                            title: 'Fail Message',
                            type: PropertyType.Input,
                            editable: true,
                            default: 'Validation failed',
                        },
                    ],
                },
            },
        ],
    },
    variables: [],
})
export class RequestValidationAddon {
    /**
     * Resolve a field path from the submitted (input) document.
     */
    private resolveVariable(path: string, document: IPolicyDocument): any {
        return findOptions(document, path);
    }

    /**
     * Resolve a field from source documents.
     * - 'in' / 'not_in': collect the field from all source docs into an array
     * - all other operators: use the first source document only
     */
    private resolveSourceValue(path: string, sourceDocuments: any[], operator: string): any {
        if (operator === 'in' || operator === 'not_in') {
            return sourceDocuments.map((doc) => findOptions(doc, path));
        }
        return findOptions(sourceDocuments[0], path);
    }

    /**
     * Resolve one side of a condition.
     * - 'value' raw configured string
     * - 'document' field path on the submitted document
     * - 'source' field path on the source document(s), collapsed by operator
     */
    private resolveConditionSide(
        raw: string,
        sourceType: 'value' | 'document' | 'source',
        operator: string,
        document: IPolicyDocument,
        sourceDocuments: any[]
    ): any {
        switch (sourceType) {
            case 'document': return this.resolveVariable(raw, document);
            case 'source':   return this.resolveSourceValue(raw, sourceDocuments, operator);
            default:         return raw;
        }
    }

    /**
     * Evaluate a condition given resolved left and right values.
     */
    private evaluateCondition(left: any, type: string, right: any): boolean {
        switch (type) {
            case 'not_equal':
                return left !== right;
            case 'in':
                return Array.isArray(right) ? right.includes(left) : right === left;
            case 'not_in':
                return Array.isArray(right) ? !right.includes(left) : right !== left;
            case 'gt':
                return left > right;
            case 'lt':
                return left < right;
            default:
                return left === right;
        }
    }

    /**
     * Build a MongoDB filter object from a validation item's filter array.
     * typeValue 'variable' resolves the value from the submitted document at runtime.
     */
    private buildDbFilter(filters: any[], policyId: string, document: IPolicyDocument): Record<string, any> {
        const filter: Record<string, any> = { policyId: { $eq: policyId } };

        for (const f of (filters || [])) {
            const value = f.typeValue === 'variable'
                ? this.resolveVariable(f.value, document)
                : f.value;

            switch (f.type) {
                case 'not_equal': filter[f.field] = { $ne: value }; break;
                case 'in':        filter[f.field] = { $in: Array.isArray(value) ? value : [value] }; break;
                case 'not_in':    filter[f.field] = { $nin: Array.isArray(value) ? value : [value] }; break;
                default:          filter[f.field] = { $eq: value }; break;
            }
        }

        return filter;
    }

    /**
     * Run a single validation item against the submitted document.
     * Finds source documents and evaluates all conditions.
     * Returns an error string on the first failure, or null when all pass.
     */
    private async runValidation(
        ref: IPolicyValidatorBlock,
        validation: any,
        document: IPolicyDocument
    ): Promise<string | null> {
        const filter = this.buildDbFilter(validation.filters, ref.policyId, document);

        const sourceDocuments: any[] = validation.dbCollection === 'VpDocument'
            ? await ref.databaseServer.getVpDocuments(filter as any) as any[]
            : await ref.databaseServer.getVcDocuments(filter as any) as any[];

        if (!sourceDocuments?.length) {
            return validation.failMessage || 'Source document not found';
        }

        for (const condition of (validation.conditions || [])) {
            const left  = this.resolveConditionSide(condition.field, condition.fieldSource, condition.type, document, sourceDocuments);
            const right = this.resolveConditionSide(condition.value, condition.valueSource, condition.type, document, sourceDocuments);

            if (!this.evaluateCondition(left, condition.type, right)) {
                return validation.failMessage || 'Validation failed';
            }
        }

        return null;
    }

    /**
     * Validate a single document through all configured validation items.
     * Returns an error string on the first failure, or null when all pass.
     */
    private async validateDocument(
        ref: IPolicyValidatorBlock,
        options: any,
        document: IPolicyDocument
    ): Promise<string | null> {
        for (const validation of (options.validations || [])) {
            const error = await this.runValidation(ref, validation, document);
            if (error) {
                return error;
            }
        }
        return null;
    }

    /**
     * Run block logic called by the parent requestVcDocumentBlockAddon validator loop.
     * @param event
     */
    public async run(event: IPolicyEvent<IPolicyEventState>): Promise<string> {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyValidatorBlock>(this);
        const options = await ref.getOptions(event.user);
        const document = event?.data?.data;

        if (!document) {
            return 'Invalid document';
        }

        if (Array.isArray(document)) {
            for (const doc of document) {
                const error = await this.validateDocument(ref, options, doc);
                if (error) {
                    return error;
                }
            }
            return null;
        }

        return this.validateDocument(ref, options, document);
    }

    /**
     * Run block action
     * @event PolicyInputEventType.RunEvent
     * @param event
     */
    @ActionCallback({
        output: [
            PolicyOutputEventType.RunEvent,
            PolicyOutputEventType.RefreshEvent,
            PolicyOutputEventType.ErrorEvent,
        ],
    })
    @CatchErrors()
    async runAction(event: IPolicyEvent<IPolicyEventState>): Promise<any> {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyValidatorBlock>(this);
        ref.log(`runAction`);

        const error = await ref.run(event);
        if (error) {
            throw new BlockActionError(error, ref.blockType, ref.uuid);
        }

        ref.triggerEvents(PolicyOutputEventType.RunEvent, event.user, event.data, event.actionStatus);
        ref.triggerEvents(PolicyOutputEventType.ReleaseEvent, event.user, null, event.actionStatus);
        ref.triggerEvents(PolicyOutputEventType.RefreshEvent, event.user, event.data, event.actionStatus);

        await PolicyComponentsUtils.ExternalEventFn(new ExternalEvent(ExternalEventType.Run, ref, event?.user, {
            documents: ExternalDocuments(event?.data?.data),
        }));

        ref.backup();

        return event.data;
    }
}
