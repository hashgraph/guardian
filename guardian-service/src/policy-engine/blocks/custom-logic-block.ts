import { ActionCallback, BasicBlock } from '@policy-engine/helpers/decorators';
import { CatchErrors } from '@policy-engine/helpers/decorators/catch-errors';
import { PolicyComponentsUtils } from '@policy-engine/policy-components-utils';
import { IPolicyCalculateBlock, IPolicyDocument, IPolicyEventState } from '@policy-engine/policy-engine.interface';
import { VcHelper } from '@helpers/vc-helper';
import { SchemaHelper } from '@guardian/interfaces';
import * as mathjs from 'mathjs';
import { IPolicyEvent, PolicyInputEventType, PolicyOutputEventType } from '@policy-engine/interfaces';
import { ChildrenType, ControlType } from '@policy-engine/interfaces/block-about';
import { IPolicyUser } from '@policy-engine/policy-user';
import { PolicyUtils } from '@policy-engine/helpers/utils';

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
    public async runAction(event: IPolicyEvent<IPolicyEventState>) {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyCalculateBlock>(this);

        try {
            event.data.data = await this.execute(event.data, event.user);
            ref.triggerEvents(PolicyOutputEventType.RunEvent, event.user, event.data);
            ref.triggerEvents(PolicyOutputEventType.RefreshEvent, event.user, event.data);
        } catch (error) {
            ref.error(PolicyUtils.getErrorMessage(error));
        }
    }

    /**
     * Execute logic
     * @param state
     * @param user
     */
    execute(state: IPolicyEventState, user: IPolicyUser): Promise<any> {
        return new Promise((resolve, reject) => {
            const ref = PolicyComponentsUtils.GetBlockRef<IPolicyCalculateBlock>(this);
            let documents: IPolicyDocument[] = null;
            if (Array.isArray(state.data)) {
                documents = state.data;
            } else {
                documents = [state.data];
            }

            const done = async (result) => {
                try {
                    const owner = PolicyUtils.getDocumentOwner(ref, documents[0]);
                    let root;
                    switch(ref.options.documentSigner) {
                        case 'owner':
                            root = await PolicyUtils.getHederaAccount(ref, owner.did);
                            break;
                        case 'issuer':
                            const issuer = PolicyUtils.getDocumentIssuer(documents[0].document);
                            root = await PolicyUtils.getHederaAccount(ref, issuer);
                            break;
                        default:
                            root = await PolicyUtils.getHederaAccount(ref, ref.policyOwner);
                            break;
                    }
                    const outputSchema = await ref.databaseServer.getSchemaByIRI(ref.options.outputSchema, ref.topicId);
                    const context = SchemaHelper.getContext(outputSchema);
                    const relationships = documents.filter(d => !!d.messageId).map(d => d.messageId);
                    let accounts = documents.reduce((a: any, b: any) => Object.assign(a, b.accounts), {});
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

                        const item = PolicyUtils.createVC(ref, owner, newVC);
                        item.type = outputSchema.iri;
                        item.schema = outputSchema.iri;
                        item.relationships = relationships.length ? relationships : null;
                        item.accounts = Object.keys(accounts).length ? accounts : null;;
                        return item;
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
