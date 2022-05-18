import { BasicBlock } from '@policy-engine/helpers/decorators';
import { CatchErrors } from '@policy-engine/helpers/decorators/catch-errors';
import { IAuthUser } from '@auth/auth.interface';
import { PolicyComponentsUtils } from '@policy-engine/policy-components-utils';
import { IPolicyCalculateBlock } from '@policy-engine/policy-engine.interface';
import { getMongoRepository } from 'typeorm';
import { Schema as SchemaCollection } from '@entity/schema';
import { VcHelper } from '@helpers/vcHelper';
import { SchemaHelper } from 'interfaces';
import { Inject } from '@helpers/decorators/inject';
import { Users } from '@helpers/users';
import * as mathjs from 'mathjs';

@BasicBlock({
    blockType: 'customLogicBlock',
    commonBlock: true
})
export class CustomLogicBlock {
    @Inject()
    private users: Users;

    public start() {
        console.log('Custom logic block');
    }

    @CatchErrors()
    public async runAction(state: any, user: IAuthUser) {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyCalculateBlock>(this);

        try {
            state.data = await this.execute(state, user);
            await ref.runNext(user, state);
            ref.callDependencyCallbacks(user);
            ref.callParentContainerCallback(user);
        } catch (e) {
            ref.error(e.message);
        }

    }

    execute(state: any, user: IAuthUser): Promise<any> {
        return new Promise((resolve, reject) => {
            const ref = PolicyComponentsUtils.GetBlockRef<IPolicyCalculateBlock>(this);
            let documents = null;
            if (Array.isArray(state.data)) {
                documents = state.data;
            } else {
                documents = [state.data];
            }



            const done = async (result) => {
                try {
                    const root = await this.users.getHederaAccount(ref.policyOwner);
                    const outputSchema = await getMongoRepository(SchemaCollection).findOne({
                        iri: ref.options.outputSchema
                    });
                    const context = SchemaHelper.getContext(outputSchema);
                    const owner  = documents[0].owner;
                    const relationships = documents.filter(d => !!d.messageId).map(d => d.messageId);
                    const VCHelper = new VcHelper();

                    const processing = async (document) => {

                        const newVC = await VCHelper.createVC(
                            root.did,
                            root.hederaAccountKey,
                            {
                                ...context,
                                ...document,
                                policyId: ref.policyId
                            }
                        );


                        return {
                            hash: newVC.toCredentialHash(),
                            owner: owner,
                            document: newVC.toJsonTree(),
                            schema: outputSchema.iri,
                            type: outputSchema.iri,
                            policyId: ref.policyId,
                            tag: ref.tag,
                            messageId: null,
                            topicId: null,
                            relationships: relationships.length ? relationships : null
                        };
                    }

                    if (Array.isArray(result)) {
                        const items = [];
                        for (let r of result) {
                            items.push(await processing(r))
                        }
                        resolve(items);
                        return;
                    } else {
                        resolve(await processing(result));
                        return;
                    }

                } catch (e) {
                    reject(e);
                }
            }

            const func = Function(`const [done, user, documents, mathjs] = arguments; ${ref.options.expression}`);
            func.apply(documents, [done, user, documents, mathjs]);
        });
    }
}
