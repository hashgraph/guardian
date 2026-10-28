import { ActionCallback, BasicBlock } from '../helpers/decorators/index.js';
import { PolicyComponentsUtils } from '../policy-components-utils.js';
import { VcDocument } from '@guardian/hedera/vcjs/vc-document';
import { PolicyUtils } from '../helpers/utils.js';
import { IPolicyEvent, PolicyInputEventType, PolicyOutputEventType } from '../interfaces/index.js';
import { ChildrenType, ControlType, PropertyType } from '../interfaces/block-about.js';
import { PolicyUser } from '../policy-user.js';
import { IPolicyDocument, IPolicyEventState } from '../policy-engine.interface.js';
import { ExternalDocuments, ExternalEvent, ExternalEventType } from '../interfaces/external-event.js';
import { LocationType } from '@guardian/interfaces';
import { getPreviewDocumentSchema, isPreviewComputedRead, trackPreviewFormulaScope } from '../helpers/preview.js';
import { findPreviewScriptFields } from '../helpers/preview-script-fields.js';
import { PreviewReadTracker, type IPreviewReadSite } from '../helpers/workers/preview-read-tracker.js';

/**
 * Switch block
 */
@BasicBlock({
    blockType: 'switchBlock',
    commonBlock: true,
    actionType: LocationType.REMOTE,
    canMock: false,
    about: {
        label: 'Switch',
        title: `Add 'Switch' Block`,
        post: false,
        get: false,
        children: ChildrenType.None,
        control: ControlType.Server,
        input: [
            PolicyInputEventType.RunEvent
        ],
        output: [
            PolicyOutputEventType.RefreshEvent
        ],
        defaultEvent: false,
        properties: [
            {
                name: 'executionFlow',
                label: 'Execution Flow',
                title: 'Execution Flow',
                type: PropertyType.Select,
                editable: true,
                items: [
                    {label: 'First True', value: 'firstTrue'},
                    {label: 'All True', value: 'allTrue'}
                ]
            }, {
                name: 'conditions',
                label: 'Conditions',
                title: 'Conditions',
                type: PropertyType.Array,
                editable: true,
                items: {
                    label: 'Condition Type',
                    value: '',
                    properties: [
                        {
                            name: 'tag',
                            label: 'Condition tag',
                            title: 'Condition tag',
                            type: PropertyType.Input,
                            editable: true
                        },
                        {
                            name: 'type',
                            label: 'Type',
                            title: 'Type',
                            type: PropertyType.Select,
                            items: [
                                { label: 'Equal', value: 'equal'},
                                { label: 'Not Equal', value: 'not_equal'},
                                { label: 'Unconditional', value: 'unconditional'}
                            ],
                            editable: true
                        },
                        {
                            name: 'value',
                            label: 'Condition',
                            title: 'Condition',
                            type: PropertyType.Input,
                            editable: true
                        },
                        {
                            name: 'actor',
                            label: 'Actor',
                            title: 'Actor',
                            type: PropertyType.Select,
                            editable: true,
                            items: [
                                    { label: 'Current User', value: ''},
                                    { label: 'Document Owner', value: 'owner'},
                                    { label: 'Document Issuer', value: 'issuer'}
                                ]
                        }
                    ]
                }
            },
        ]
    },
    variables: []
})
export class SwitchBlock {
    /**
     * Get scope
     * @param docs
     * @private
     */
    private getScope(docs: IPolicyDocument | IPolicyDocument[]): any {
        let result: any = {};
        if (!docs) {
            return null;
        }
        if (Array.isArray(docs)) {
            const scopes: any[] = [];
            for (const doc of docs) {
                if (doc.document && doc.document.type.includes('VerifiableCredential')) {
                    const element = VcDocument.fromJsonTree(doc.document);
                    const scope = PolicyUtils.getVCScope(element);
                    scopes.push(scope);
                };
            }
            result = this.aggregateScope(scopes);
        } else {
            const doc = docs;
            if (!doc.document) {
                return result;
            };
            const element = VcDocument.fromJsonTree(doc.document);
            result = PolicyUtils.getVCScope(element);
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
            return null;
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
     * Run block action
     * @event PolicyEventType.Run
     * @param {IPolicyEvent} event
     */
    @ActionCallback({
        output: [PolicyOutputEventType.RunEvent, PolicyOutputEventType.RefreshEvent]
    })
    async runAction(event: IPolicyEvent<IPolicyEventState>) {
        const ref = PolicyComponentsUtils.GetBlockRef(this);
        const options = await ref.getOptions(event.user);
        ref.log(`switch: ${event.user?.id}`);

        const docs: IPolicyDocument | IPolicyDocument[] = event.data.data;

        let owner: string = null;
        let issuer: string = null;
        let group: string = null;
        if (Array.isArray(docs)) {
            owner = docs[0]?.owner;
            issuer = PolicyUtils.getDocumentIssuer(docs[0]?.document);
            group = docs[0]?.document?.group;
        } else {
            owner = docs?.owner;
            issuer = PolicyUtils.getDocumentIssuer(docs?.document);
            group = docs?.document?.group;
        }

        const scope = this.getScope(docs);

        const { conditions, executionFlow } = options;
        const previewSource = event.actionStatus?.preview ? event.actionStatus.getPreviewSource() : null;
        const previewDocuments = (Array.isArray(docs) ? docs : [docs]).filter((doc) => !!doc);
        const unknownSchema = (Array.isArray(docs) ? docs : [docs]).some((doc) => getPreviewDocumentSchema(doc) === null);
        const formSchema = previewDocuments.some((doc) => {
            const schema = getPreviewDocumentSchema(doc);
            return schema === null || schema === previewSource?.schema;
        });
        const recordReads = (formula: string, sites: IPreviewReadSite[]) => {
            for (const read of findPreviewScriptFields(formula, sites, [], previewSource.schema, previewSource.paths, false, '', [], 'mathjs')) {
                if (unknownSchema || !isPreviewComputedRead(docs, read.schema, read.path)) {
                    event.actionStatus.addPreviewRead(read.schema, read.fullPath ?? read.path);
                }
            }
        };
        const evaluateFormula = (formula: string) => {
            if (!previewSource || !formSchema) {
                return PolicyUtils.evaluateCustomFormula(formula, scope);
            }
            const tracker = new PreviewReadTracker();
            tracker.configure(formula);
            const result = PolicyUtils.evaluateCustomFormula(formula, trackPreviewFormulaScope(tracker, scope, previewSource.schema, previewSource.paths));
            recordReads(formula, tracker.takeSites());
            return result;
        };
        const tags: string[] = [];
        for (const condition of conditions) {
            const type = condition.type as string;
            const value = condition.value as string;
            const actor = condition.actor as string;
            const tag = condition.tag as PolicyOutputEventType;

            let result = false;
            if (type === 'equal') {
                if (scope) {
                    const formulaResult = evaluateFormula(value);
                    if (formulaResult === 'Incorrect formula') {
                        ref.error(`expression: ${result}, ${JSON.stringify(scope)}`);
                        result = false;
                    } else {
                        result = !!formulaResult;
                    }
                } else {
                    result = false;
                }
            } else if (type === 'not_equal') {
                if (scope) {
                    const formulaResult = evaluateFormula(value);
                    if (formulaResult === 'Incorrect formula') {
                        ref.error(`expression: ${result}, ${JSON.stringify(scope)}`);
                        result = false;
                    } else {
                        result = !formulaResult;
                    }
                } else {
                    result = false;
                }
            } else if (type === 'unconditional') {
                result = true;
            }

            let curUser: PolicyUser = event.user;
            if (actor === 'owner' && owner) {
                curUser = await PolicyUtils.getPolicyUser(ref, owner, group, event?.user?.userId);
            } else if (actor === 'issuer' && issuer) {
                curUser = await PolicyUtils.getPolicyUser(ref, issuer, group, event?.user?.userId);
            }

            ref.log(`check condition: ${curUser?.id}, ${type},  ${value},  ${result}, ${JSON.stringify(scope)}`);

            if (result) {
                await ref.triggerEvents(tag, curUser, event.data, event.actionStatus);
                await ref.triggerEvents(PolicyOutputEventType.RefreshEvent, curUser, event.data, event.actionStatus);
                tags.push(tag);
                if (executionFlow === 'firstTrue') {
                    break;
                }
            }
        }
        await ref.triggerEvents(PolicyOutputEventType.ReleaseEvent, event?.user, null, event.actionStatus);
        PolicyComponentsUtils.ExternalEventFn(new ExternalEvent(ExternalEventType.Run, ref, event?.user, {
            conditions: tags,
            documents: ExternalDocuments(docs),
        }));

        ref.backup();

        return event.data;
    }
}
