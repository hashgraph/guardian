import { Worker } from 'node:worker_threads';
import path from 'path'
import { ActionCallback, BasicBlock } from '@policy-engine/helpers/decorators';
import { CatchErrors } from '@policy-engine/helpers/decorators/catch-errors';
import { PolicyComponentsUtils } from '@policy-engine/policy-components-utils';
import { IPolicyCalculateBlock, IPolicyDocument, IPolicyEventState } from '@policy-engine/policy-engine.interface';
import {
    VcHelper,
    DIDDocument,
    DIDMessage,
    MessageAction,
    MessageServer,
    KeyType
} from '@guardian/common';
import { ArtifactType, GenerateUUIDv4, SchemaHelper } from '@guardian/interfaces';
import { IPolicyEvent, PolicyInputEventType, PolicyOutputEventType } from '@policy-engine/interfaces';
import { ChildrenType, ControlType, PropertyType } from '@policy-engine/interfaces/block-about';
import { IPolicyUser } from '@policy-engine/policy-user';
import { IHederaAccount, PolicyUtils } from '@policy-engine/helpers/utils';
import { BlockActionError } from '@policy-engine/errors';
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
        defaultEvent: true,
        properties: [{
            name: 'unsigned',
            label: 'Unsigned VC',
            title: 'Unsigned document',
            type: PropertyType.Checkbox
        }]
    },
    variables: [
        { path: 'options.outputSchema', alias: 'schema', type: 'Schema' }
    ]
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
    execute(state: IPolicyEventState, user: IPolicyUser): Promise<IPolicyDocument | IPolicyDocument[]> {
        return new Promise<IPolicyDocument | IPolicyDocument[]>(async (resolve, reject) => {
            try {
                const ref = PolicyComponentsUtils.GetBlockRef<IPolicyCalculateBlock>(this);
                let documents: IPolicyDocument[];
                if (Array.isArray(state.data)) {
                    documents = state.data;
                } else {
                    documents = [state.data];
                }

                let metadata: any;
                if (ref.options.unsigned) {
                    metadata = null;
                } else {
                    metadata = await this.aggregateMetadata(documents, user, ref);
                }

                const done = async (result: any | any[]) => {
                    const processing = async (json: any): Promise<IPolicyDocument> => {
                        if (ref.options.unsigned) {
                            return await this.createUnsignedDocument(json, ref);
                        } else {
                            return await this.createDocument(json, metadata, ref);
                        }
                    }
                    if (Array.isArray(result)) {
                        const items: IPolicyDocument[] = [];
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

                const files = Array.isArray(ref.options.artifacts) ? ref.options.artifacts : [];
                const execCodeArtifacts = files.filter((file: any) => file.type === ArtifactType.EXECUTABLE_CODE);
                let execCode = '';
                for (const execCodeArtifact of execCodeArtifacts) {
                    const artifactFile = await PolicyUtils.getArtifactFile(ref, execCodeArtifact.uuid);
                    execCode += artifactFile;
                }

                const artifacts = [];
                const jsonArtifacts = files.filter((file: any) => file.type === ArtifactType.JSON);
                for (const jsonArtifact of jsonArtifacts) {
                    const artifactFile = await PolicyUtils.getArtifactFile(ref, jsonArtifact.uuid);
                    artifacts.push(JSON.parse(artifactFile));
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
     * Generate document metadata
     * @param documents
     * @param user
     * @param ref
     */
    private async aggregateMetadata(
        documents: IPolicyDocument | IPolicyDocument[],
        user: IPolicyUser,
        ref: IPolicyCalculateBlock
    ) {
        const isArray = Array.isArray(documents);
        const firstDocument = isArray ? documents[0] : documents;
        const owner = PolicyUtils.getDocumentOwner(ref, firstDocument);
        const relationships = [];
        let accounts: any = {};
        let tokens: any = {};
        let id: string;
        let reference: string;
        if (isArray) {
            const credentialSubject = documents[0].document?.credentialSubject;
            if (credentialSubject) {
                if (Array.isArray(credentialSubject)) {
                    id = credentialSubject[0].id;
                    reference = credentialSubject[0].ref;
                } else if (credentialSubject) {
                    id = credentialSubject.id;
                    reference = credentialSubject.ref;
                }
            }
            for (const doc of documents) {
                accounts = Object.assign(accounts, doc.accounts);
                tokens = Object.assign(tokens, doc.tokens);
                if (doc.messageId) {
                    relationships.push(doc.messageId);
                }
            }
        } else {
            const credentialSubject = documents.document?.credentialSubject;
            if (credentialSubject) {
                if (Array.isArray(credentialSubject)) {
                    id = credentialSubject[0].id;
                    reference = credentialSubject[0].ref;
                } else if (credentialSubject) {
                    id = credentialSubject.id;
                    reference = credentialSubject.ref;
                }
            }
            accounts = Object.assign(accounts, documents.accounts);
            tokens = Object.assign(tokens, documents.tokens);
            if (documents.messageId) {
                relationships.push(documents.messageId);
            }
        }

        if (ref.options.idType !== 'DOCUMENT') {
            id = await this.generateId(ref.options.idType, user);
        }

        let root: IHederaAccount;
        switch (ref.options.documentSigner) {
            case 'owner':
                root = await PolicyUtils.getHederaAccount(ref, owner.did);
                break;
            case 'issuer':
                const issuer = PolicyUtils.getDocumentIssuer(firstDocument.document);
                root = await PolicyUtils.getHederaAccount(ref, issuer);
                break;
            default:
                root = await PolicyUtils.getHederaAccount(ref, ref.policyOwner);
                break;
        }

        return { owner, id, reference, accounts, tokens, relationships, root };
    }

    /**
     * Generate signed document
     * @param json
     * @param metadata
     * @param ref
     */
    private async createDocument(
        json: any,
        metadata: any,
        ref: IPolicyCalculateBlock
    ): Promise<IPolicyDocument> {
        const {
            owner,
            id,
            reference,
            accounts,
            tokens,
            relationships,
            root
        } = metadata;

        // <-- new vc
        const VCHelper = new VcHelper();

        const outputSchema = await PolicyUtils.loadSchemaByID(ref, ref.options.outputSchema);
        const vcSubject: any = {
            ...SchemaHelper.getContext(outputSchema),
            ...json
        }
        vcSubject.policyId = ref.policyId;
        vcSubject.id = id;
        if (reference) {
            vcSubject.ref = reference;
        }
        if (ref.dryRun) {
            VCHelper.addDryRunContext(vcSubject);
        }
        const res = await VCHelper.verifySubject(vcSubject);
        if (!res.ok) {
            throw new Error(JSON.stringify(res.error));
        }

        const newVC = await VCHelper.createVC(root.did, root.hederaAccountKey, vcSubject);

        const item = PolicyUtils.createVC(ref, owner, newVC);
        item.type = outputSchema.iri;
        item.schema = outputSchema.iri;
        item.relationships = relationships.length ? relationships : null;
        item.accounts = accounts && Object.keys(accounts).length ? accounts : null;
        item.tokens = tokens && Object.keys(tokens).length ? tokens : null;
        // -->

        return item;
    }

    /**
     * Generate unsigned document
     * @param json
     * @param ref
     */
    private async createUnsignedDocument(
        json: any,
        ref: IPolicyCalculateBlock
    ): Promise<IPolicyDocument> {
        const vc = PolicyUtils.createVcFromSubject(json);
        return PolicyUtils.createUnsignedVC(ref, vc);
    }

    /**
     * Generate id
     * @param idType
     * @param user
     * @param userHederaAccount
     * @param userHederaKey
     */
    private async generateId(
        idType: string,
        user: IPolicyUser
    ): Promise<string | undefined> {
        const ref = PolicyComponentsUtils.GetBlockRef(this);
        try {
            if (idType === 'UUID') {
                return GenerateUUIDv4();
            }
            if (idType === 'DID') {
                const topic = await PolicyUtils.getOrCreateTopic(ref, 'root', null, null);

                const didObject = await DIDDocument.create(null, topic.topicId);
                const did = didObject.getDid();
                const key = didObject.getPrivateKeyString();

                const message = new DIDMessage(MessageAction.CreateDID);
                message.setDocument(didObject);

                const hederaAccount = await PolicyUtils.getHederaAccount(ref, user.did);
                const client = new MessageServer(
                    hederaAccount.hederaAccountId,
                    hederaAccount.hederaAccountKey,
                    ref.dryRun
                );
                const messageResult = await client
                    .setTopicObject(topic)
                    .sendMessage(message);

                const item = PolicyUtils.createDID(ref, user, didObject);
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