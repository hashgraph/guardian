import { Worker } from 'node:worker_threads';
import path from 'path'
import { ActionCallback, BasicBlock } from '@policy-engine/helpers/decorators';
import { CatchErrors } from '@policy-engine/helpers/decorators/catch-errors';
import { PolicyComponentsUtils } from '@policy-engine/policy-components-utils';
import { IPolicyCalculateBlock, IPolicyDocument, IPolicyEventState } from '@policy-engine/policy-engine.interface';
import { VcHelper } from '@helpers/vc-helper';
import { ArtifactType, GenerateUUIDv4, SchemaHelper } from '@guardian/interfaces';
import { IPolicyEvent, PolicyInputEventType, PolicyOutputEventType } from '@policy-engine/interfaces';
import { ChildrenType, ControlType } from '@policy-engine/interfaces/block-about';
import { IPolicyUser } from '@policy-engine/policy-user';
import { PolicyUtils } from '@policy-engine/helpers/utils';
import { DIDDocument, DIDMessage, MessageAction, MessageServer } from '@hedera-modules';
import { KeyType } from '@helpers/wallet';
import { BlockActionError } from '@policy-engine/errors';
import { DatabaseServer } from '@database-modules';
import { ExternalDocuments, ExternalEvent, ExternalEventType } from '@policy-engine/interfaces/external-event';

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
            PolicyOutputEventType.RefreshEvent,
            PolicyOutputEventType.ErrorEvent
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
        output: [
            PolicyOutputEventType.RunEvent,
            PolicyOutputEventType.RefreshEvent,
            PolicyOutputEventType.ErrorEvent
        ]
    })
    @CatchErrors()
    public async runAction(event: IPolicyEvent<IPolicyEventState>) {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyCalculateBlock>(this);

        try {
            event.data.data = await this.execute(event.data, event.user);
            ref.triggerEvents(PolicyOutputEventType.RunEvent, event.user, event.data);
            ref.triggerEvents(PolicyOutputEventType.ReleaseEvent, event.user, null);
            ref.triggerEvents(PolicyOutputEventType.RefreshEvent, event.user, event.data);
            PolicyComponentsUtils.ExternalEventFn(new ExternalEvent(ExternalEventType.Run, ref, event?.user, {
                documents: ExternalDocuments(event?.data?.data)
            }));
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
        return new Promise(async (resolve, reject) => {
            try {
                const ref = PolicyComponentsUtils.GetBlockRef<IPolicyCalculateBlock>(this);
                const idType = ref.options.idType;
                let documents: IPolicyDocument[] = null;
                if (Array.isArray(state.data)) {
                    documents = state.data;
                } else {
                    documents = [state.data];
                }

                const done = async (result) => {
                    const owner = PolicyUtils.getDocumentOwner(ref, documents[0]);
                    const hederaAccount = await PolicyUtils.getHederaAccount(ref, user.did);
                    let root;
                    switch (ref.options.documentSigner) {
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

                    const relationships = [];
                    let accounts = {};
                    let tokens = {};
                    for (const doc of documents) {
                        accounts = Object.assign(accounts, doc.accounts);
                        tokens = Object.assign(tokens, doc.tokens);
                        if (doc.messageId) {
                            relationships.push(doc.messageId);
                        }
                    }

                    const VCHelper = new VcHelper();

                    const processing = async (document) => {

                        const vcSubject = {
                            id: idType === 'DOCUMENT'
                                ? documents[0].document.id
                                : await this.generateId(
                                    idType, user, hederaAccount.hederaAccountId, hederaAccount.hederaAccountKey
                                ),
                            ...context,
                            ...document,
                            policyId: ref.policyId
                        };
                        if (ref.dryRun) {
                            VCHelper.addDryRunContext(vcSubject);
                        }

                        const res = await VCHelper.verifySubject(vcSubject);
                        if (!res.ok) {
                            throw new Error(JSON.stringify(res.error));
                        }
                        const newVC = await VCHelper.createVC(
                            root.did,
                            root.hederaAccountKey,
                            vcSubject
                        );

                        const item = PolicyUtils.createVC(ref, owner, newVC);
                        item.type = outputSchema.iri;
                        item.schema = outputSchema.iri;
                        item.relationships = relationships.length ? relationships : null;
                        item.accounts = Object.keys(accounts).length ? accounts : null;
                        item.tokens = Object.keys(tokens).length ? tokens : null;
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
                }

                const execCodeArtifacts =
                    ref.options.artifacts?.filter(
                        (artifact) => artifact.type === ArtifactType.EXECUTABLE_CODE
                    ) || [];
                let execCode = '';
                for (const execCodeArtifact of execCodeArtifacts) {
                    const artifactFile = await DatabaseServer.getArtifactFileByUUID(
                        execCodeArtifact.uuid
                    );
                    execCode += artifactFile.toString();
                }

                const artifacts = [];
                const jsonArtifacts =
                    ref.options.artifacts?.filter(
                        (artifact) => artifact.type === ArtifactType.JSON
                    ) || [];
                for (const jsonArtifact of jsonArtifacts) {
                    const artifactFile = await DatabaseServer.getArtifactFileByUUID(
                        jsonArtifact.uuid
                    );
                    artifacts.push(JSON.parse(artifactFile.toString()));
                }

                const worker = new Worker(path.join(path.dirname(__filename), '..', 'helpers', 'custom-logic-worker.js'), {
                    workerData: {
                        execFunc: `const [done, user, documents, mathjs, artifacts] = arguments;${execCode}${ref.options.expression}`,
                        user,
                        documents,
                        artifacts
                    },
                });
                worker.on('error', (error) => {
                    reject(error);
                });
                worker.on('message', async (result) => {
                    try {
                        await done(result);
                    } catch (error) {
                        reject(error);
                    }
                });
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Generate id
     * @param idType
     * @param user
     * @param userHederaAccount
     * @param userHederaKey
     */
    async generateId(idType: string, user: IPolicyUser, userHederaAccount: string, userHederaKey: string): Promise<string | undefined> {
        const ref = PolicyComponentsUtils.GetBlockRef(this);
        try {
            if (idType === 'UUID') {
                return GenerateUUIDv4();
            }
            if (idType === 'DID') {
                const topic = await PolicyUtils.getOrCreateTopic(ref, 'root', null, null);

                const didObject = DIDDocument.create(null, topic.topicId);
                const did = didObject.getDid();
                const key = didObject.getPrivateKeyString();
                const document = didObject.getDocument();

                const message = new DIDMessage(MessageAction.CreateDID);
                message.setDocument(didObject);

                const client = new MessageServer(userHederaAccount, userHederaKey, ref.dryRun);
                const messageResult = await client
                    .setTopicObject(topic)
                    .sendMessage(message);

                const item = PolicyUtils.createDID(ref, user, did, document);
                item.messageId = messageResult.getId();
                item.topicId = messageResult.getTopicId();

                await ref.databaseServer.saveDid(item);

                await PolicyUtils.setAccountKey(ref, user.did, KeyType.KEY, did, key);
                return did;
            }
            if (idType === 'OWNER') {
                return user.did;
            }
            return undefined;
        } catch (error) {
            ref.error(`generateId: ${idType} : ${PolicyUtils.getErrorMessage(error)}`);
            throw new BlockActionError(error, ref.blockType, ref.uuid);
        }
    }
}
