import { BasicBlock } from '@policy-engine/helpers/decorators';
import { PolicyValidationResultsContainer } from '@policy-engine/policy-validation-results-container';
import { PolicyComponentsUtils } from '../policy-components-utils';
import { IAuthUser } from '@auth/auth.interface';
import { VcDocument } from '@hedera-modules';
import { Users } from '@helpers/users';
import { Inject } from '@helpers/decorators/inject';
import { PolicyUtils } from '@policy-engine/helpers/utils';
import { IPolicyEvent, PolicyInputEventType, PolicyOutputEventType } from '@policy-engine/interfaces';
import { ChildrenType, ControlType } from '@policy-engine/interfaces/block-about';

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
            PolicyOutputEventType.RunEvent,
            PolicyOutputEventType.RefreshEvent
        ]
    }
})
export class SwitchBlock {
    @Inject()
    private users: Users;

    private getScope(docs: any | any[]): any {
        let result: any = {};
        if (!docs) {
            return null;
        }
        if (Array.isArray(docs)) {
            const scopes: any[] = [];
            for (let doc of docs) {
                if (doc.document) {
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

    private aggregateScope(scopes: any[]): any {
        const result: any = {};
        if (!scopes || !scopes.length) {
            return null;
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

    /**
     * @event PolicyEventType.Run
     * @param {IPolicyEvent} event
     */
    async runAction(event: IPolicyEvent<any>) {
        const ref = PolicyComponentsUtils.GetBlockRef(this);

        ref.log(`switch: ${event.user?.did}`);

        const docs: any | any[] = event.data.data;

        let owner: string = null;
        let issuer: string = null;
        if (Array.isArray(docs)) {
            owner = docs[0]?.owner;
            issuer = docs[0]?.document?.issuer;
        } else {
            owner = docs?.owner;
            issuer = docs?.document?.issuer;

        }

        const scope = this.getScope(docs);

        const { conditions, executionFlow } = ref.options;
        for (let i = 0; i < conditions.length; i++) {
            const condition = conditions[i];
            const type = condition.type;
            const value = condition.value;
            const actor = condition.actor;
            const triggerEvent = condition.event;

            let result = false;
            if (type == 'equal') {
                if (scope) {
                    result = PolicyUtils.evaluate(value, scope);
                } else {
                    result = false;
                }
            } else if (type == 'not_equal') {
                if (scope) {
                    result = !PolicyUtils.evaluate(value, scope);
                } else {
                    result = false;
                }
            } else if (type == 'unconditional') {
                result = true;
            }

            let curUser: IAuthUser = event.user;
            if (actor == 'owner' && owner) {
                curUser = await this.users.getUserById(owner);
            } else if (actor == 'issuer' && issuer) {
                curUser = await this.users.getUserById(issuer);
            }

            ref.log(`check condition: ${curUser?.did}, ${type},  ${value},  ${result}, ${JSON.stringify(scope)}`);

            if (result) {
                ref.triggerEvent(triggerEvent, curUser, event.data);
                if (executionFlow == 'firstTrue') {
                    return;
                }
            }
        }
    }

    public async validate(resultsContainer: PolicyValidationResultsContainer): Promise<void> {
        const ref = PolicyComponentsUtils.GetBlockRef(this);
        try {
            if (!['firstTrue', 'allTrue'].find(item => item === ref.options.executionFlow)) {
                resultsContainer.addBlockError(ref.uuid, 'Option "executionFlow" must be one of firstTrue, allTrue');
            }

            if (!ref.options.conditions) {
                resultsContainer.addBlockError(ref.uuid, 'Option "conditions" does not set');
            }

            if (Array.isArray(ref.options.conditions)) {
                for (let condition of ref.options.conditions) {
                    if (!['equal', 'not_equal', 'unconditional'].find(item => item === condition.type)) {
                        resultsContainer.addBlockError(ref.uuid, 'Option "condition.type" must be one of equal, not_equal, unconditional');
                    }
                    if (!condition.target && !resultsContainer.isTagExist(condition.target)) {
                        resultsContainer.addBlockError(ref.uuid, `Tag "${condition.target}" does not exist`);
                    }
                    if (condition.target == ref.tag) {
                        resultsContainer.addBlockError(ref.uuid, `A block cannot redirect to itself`);
                    }

                    if (condition.type == 'equal' || condition.type == 'not_equal') {
                        if (!condition.value) {
                            resultsContainer.addBlockError(ref.uuid, 'Option "condition.value" does not set');
                        } else {
                            const vars = PolicyUtils.variables(condition.value);
                        }
                    }

                }
            } else {
                resultsContainer.addBlockError(ref.uuid, 'Option "conditions" must be an array');
            }


        } catch (error) {
            resultsContainer.addBlockError(ref.uuid, `Unhandled exception ${error.message}`);
        }
    }
}
