import { ActionCallback, BasicBlock } from '@policy-engine/helpers/decorators';
import { PolicyValidationResultsContainer } from '@policy-engine/policy-validation-results-container';
import { PolicyComponentsUtils } from '@policy-engine/policy-components-utils';
import { VcDocument } from '@hedera-modules';
import { PolicyUtils } from '@policy-engine/helpers/utils';
import { IPolicyEvent, PolicyInputEventType, PolicyOutputEventType } from '@policy-engine/interfaces';
import { ChildrenType, ControlType } from '@policy-engine/interfaces/block-about';
import { IPolicyUser } from '@policy-engine/policy-user';
import { IPolicyDocument, IPolicyEventState } from '@policy-engine/policy-engine.interface';
import { ExternalDocuments, ExternalEvent, ExternalEventType } from '@policy-engine/interfaces/external-event';

/**
 * Switch block
 */
@BasicBlock({
    blockType: 'switchBlock',
    commonBlock: true,
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
        defaultEvent: false
    }
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

        const { conditions, executionFlow } = ref.options;
        const tags: string[] = [];
        for (const condition of conditions) {
            const type = condition.type as string;
            const value = condition.value as string;
            const actor = condition.actor as string;
            const tag = condition.tag as PolicyOutputEventType;

            let result = false;
            if (type === 'equal') {
                if (scope) {
                    const formulaResult = PolicyUtils.evaluateCustomFormula(value, scope);
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
                    const formulaResult = PolicyUtils.evaluateCustomFormula(value, scope);
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

            let curUser: IPolicyUser = event.user;
            if (actor === 'owner' && owner) {
                curUser = PolicyUtils.getPolicyUser(ref, owner, group);
            } else if (actor === 'issuer' && issuer) {
                curUser = PolicyUtils.getPolicyUser(ref, issuer, group);
            }

            ref.log(`check condition: ${curUser?.id}, ${type},  ${value},  ${result}, ${JSON.stringify(scope)}`);

            if (result) {
                ref.triggerEvents(tag, curUser, event.data);
                ref.triggerEvents(PolicyOutputEventType.RefreshEvent, curUser, event.data);
                tags.push(tag);
                if (executionFlow === 'firstTrue') {
                    break;
                }
            }
        }
        ref.triggerEvents(PolicyOutputEventType.ReleaseEvent, event?.user, null);
        PolicyComponentsUtils.ExternalEventFn(new ExternalEvent(ExternalEventType.Run, ref, event?.user, {
            conditions: tags,
            documents: ExternalDocuments(docs),
        }));
    }

    /**
     * Validate block options
     * @param resultsContainer
     */
    public async validate(resultsContainer: PolicyValidationResultsContainer): Promise<void> {
        const ref = PolicyComponentsUtils.GetBlockRef(this);
        try {
            if (!['firstTrue', 'allTrue'].find(item => item === ref.options.executionFlow)) {
                resultsContainer.addBlockError(ref.uuid, 'Option "executionFlow" must be one of firstTrue, allTrue');
            }

            if (!ref.options.conditions) {
                resultsContainer.addBlockError(ref.uuid, 'Option "conditions" does not set');
            }

            const tagMap = {};
            if (Array.isArray(ref.options.conditions)) {
                for (const condition of ref.options.conditions) {
                    if (!['equal', 'not_equal', 'unconditional'].find(item => item === condition.type)) {
                        resultsContainer.addBlockError(ref.uuid, 'Option "condition.type" must be one of equal, not_equal, unconditional');
                    }
                    if (condition.type === 'equal' || condition.type === 'not_equal') {
                        if (!condition.value) {
                            resultsContainer.addBlockError(ref.uuid, 'Option "condition.value" does not set');
                        } else {
                            PolicyUtils.variables(condition.value);
                        }
                    }

                    if (!condition.tag) {
                        resultsContainer.addBlockError(ref.uuid, `Option "tag" does not set`);
                    }

                    if (tagMap[condition.tag]) {
                        resultsContainer.addBlockError(ref.uuid, `Condition Tag ${condition.tag} already exist`);
                    }

                    tagMap[condition.tag] = true;
                }
            } else {
                resultsContainer.addBlockError(ref.uuid, 'Option "conditions" must be an array');
            }

        } catch (error) {
            resultsContainer.addBlockError(ref.uuid, `Unhandled exception ${PolicyUtils.getErrorMessage(error)}`);
        }
    }
}
