import { BasicBlock } from '@policy-engine/helpers/decorators';
import { PolicyValidationResultsContainer } from '@policy-engine/policy-validation-results-container';
import { PolicyComponentsUtils } from '../policy-components-utils';
import { IAuthUser } from '@auth/auth.interface';
import { VcDocument } from '@hedera-modules';
import { Users } from '@helpers/users';
import { Inject } from '@helpers/decorators/inject';
import { PolicyUtils } from '@policy-engine/helpers/utils';

/**
 * Switch block
 */
@BasicBlock({
    blockType: 'switchBlock',
    commonBlock: true
})
export class SwitchBlock {
    @Inject()
    private users: Users;

    private getScope(docs: any | any[]): any {
        let result: any = {};
        if (!docs) {
            return result;
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

    async runAction(state: any, user: IAuthUser) {
        const ref = PolicyComponentsUtils.GetBlockRef(this);
        const docs: any | any[] = state.data;

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
            const target = condition.target;

            let result = false;
            if (type == 'equal') {
                result = PolicyUtils.evaluate(value, scope);
            } else if (type == 'not_equal') {
                result = !PolicyUtils.evaluate(value, scope);
            } else if (type == 'unconditional') {
                result = true;
            }

            let curUser: IAuthUser = user;
            if (actor == 'owner' && owner) {
                curUser = await this.users.getUserById(owner);
            } else if (actor == 'issuer' && issuer) {
                curUser = await this.users.getUserById(issuer);
            }

            ref.log(`check condition: ${curUser}, ${result}, ${JSON.stringify(scope)}`);

            if (result) {
                const block = PolicyComponentsUtils.GetBlockByTag(ref.policyId, target) as any;
                ref.runTarget(curUser, state, block).then();
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

                    if(condition.type == 'equal' || condition.type == 'not_equal') {
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
