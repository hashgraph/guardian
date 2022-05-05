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
            PolicyComponentsUtils.CallDependencyCallbacks(ref.tag, ref.policyId, user);
            PolicyComponentsUtils.CallParentContainerCallback(ref, user);
        } catch (e) {
            ref.error(e.message);
        }

    }

    execute(state: any, user: IAuthUser): Promise<any> {
        return new Promise((resolve, reject) => {
            const ref = PolicyComponentsUtils.GetBlockRef<IPolicyCalculateBlock>(this);
            let document = null;
            if (Array.isArray(state.data)) {
                document = state.data[0];
            } else {
                document = state.data;
            }

            const done = async (result) => {
                try {
                    const outputSchema = await getMongoRepository(SchemaCollection).findOne({
                        iri: ref.options.outputSchema
                    });
                    const vcSubject = {
                        ...SchemaHelper.getContext(outputSchema),
                        ...result
                    }
                    vcSubject.policyId = ref.policyId;

                    const root = await this.users.getHederaAccount(ref.policyOwner);

                    const VCHelper = new VcHelper();
                    const newVC = await VCHelper.createVC(
                        root.did,
                        root.hederaAccountKey,
                        vcSubject
                    );
                    const item = {
                        hash: newVC.toCredentialHash(),
                        owner: document.owner,
                        document: newVC.toJsonTree(),
                        schema: outputSchema.iri,
                        type: outputSchema.iri,
                        policyId: ref.policyId,
                        tag: ref.tag,
                        messageId: null,
                        topicId: null,
                        relationships: document.messageId ? [document.messageId] : null
                    };
                    resolve(item);
                } catch (e) {
                    reject(e);
                }
            }

            const func = Function(`const [done, user, document, mathjs] = arguments; ${ref.options.expression}`);
            func.apply(document, [done, user, document, mathjs]);
        });
    }
}
