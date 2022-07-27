import { ActionCallback, BasicBlock } from '@policy-engine/helpers/decorators';
import { CatchErrors } from '@policy-engine/helpers/decorators/catch-errors';
import { PolicyComponentsUtils } from '@policy-engine/policy-components-utils';
import { IPolicyCalculateBlock } from '@policy-engine/policy-engine.interface';
import { VcHelper } from '@helpers/vc-helper';
import { SchemaHelper } from '@guardian/interfaces';
import { Inject } from '@helpers/decorators/inject';
import { Users } from '@helpers/users';
import * as mathjs from 'mathjs';
import { IPolicyEvent, PolicyInputEventType, PolicyOutputEventType } from '@policy-engine/interfaces';
import { ChildrenType, ControlType } from '@policy-engine/interfaces/block-about';
import { IAuthUser } from '@guardian/common';

/**
 * Custom logic block
 */
@BasicBlock({
    blockType: 'customLogicBlock',
    commonBlock: true,
    about: {
        label: 'Custom Logic',
        title: `Add 'Custom Logic' Block`,
        post: false,
        get: false,
        children: ChildrenType.Special,
        control: ControlType.Server,
        input: [
            PolicyInputEventType.RunEvent
        ],
        output: [
            PolicyOutputEventType.RunEvent,
            PolicyOutputEventType.RefreshEvent
        ],
        defaultEvent: true
    }
})
export class CustomLogicBlock {
    /**
     * Users helper
     * @private
     */
    @Inject()
    private readonly users: Users;

    /**
     * After init callback
     */
    public afterInit() {
        console.log('Custom logic block');
    }

    /**
     * Action callback
     * @event PolicyEventType.Run
     * @param {IPolicyEvent} event
     */
    @ActionCallback({
        output: [PolicyOutputEventType.RunEvent, PolicyOutputEventType.RefreshEvent]
    })
    @CatchErrors()
    public async runAction(event: IPolicyEvent<any>) {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyCalculateBlock>(this);

        try {
            event.data.data = await this.execute(event.data, event.user);
            ref.triggerEvents(PolicyOutputEventType.RunEvent, event.user, event.data);
            ref.triggerEvents(PolicyOutputEventType.RefreshEvent, event.user, event.data);
        } catch (error) {
            ref.error(error.message);
        }
    }

    /**
     * Execute logic
     * @param state
     * @param user
     */
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
                    const outputSchema = await ref.databaseServer.getSchemaByIRI(ref.options.outputSchema, ref.topicId);
                    const context = SchemaHelper.getContext(outputSchema);
                    const owner = documents[0].owner;
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

                        return ref.databaseServer.createVCRecord(
                            ref.policyId,
                            ref.tag,
                            null,
                            newVC,
                            {
                                type: outputSchema.iri,
                                schema: outputSchema.iri,
                                owner,
                                relationships
                            }
                        );
                    }

                    if (Array.isArray(result)) {
                        const items = [];
                        for (const r of result) {
                            items.push(await processing(r))
                        }
                        resolve(items);
                        return;
                    } else {
                        resolve(await processing(result));
                        return;
                    }

                } catch (error) {
                    reject(error);
                }
            }

            const func = Function(`const [done, user, documents, mathjs] = arguments; ${ref.options.expression}`);
            func.apply(documents, [done, user, documents, mathjs]);
        });
    }
}
