import { Worker } from 'node:worker_threads';
import path from 'path'
import { ActionCallback, BasicBlock } from '../helpers/decorators/index.js';
import { CatchErrors } from '../helpers/decorators/catch-errors.js';
import { PolicyComponentsUtils } from '../policy-components-utils.js';
import { IPolicyAddonBlock, IPolicyCalculateBlock, IPolicyDocument, IPolicyEventState } from '../policy-engine.interface.js';
import { VcHelper } from '@guardian/common';
import { ArtifactType, LocationType, SchemaHelper } from '@guardian/interfaces';
import { IPolicyEvent, PolicyInputEventType, PolicyOutputEventType } from '../interfaces/index.js';
import { ChildrenType, ControlType, PropertyType } from '../interfaces/block-about.js';
import { PolicyUser } from '../policy-user.js';
import { PolicyUtils } from '../helpers/utils.js';
import { ExternalDocuments, ExternalEvent, ExternalEventType } from '../interfaces/external-event.js';
import { fileURLToPath } from 'url';
import { PolicyActionsUtils } from '../policy-actions/utils.js';

const filename = fileURLToPath(import.meta.url);

interface IMetadata {
    owner: PolicyUser;
    id: string;
    reference: string;
    accounts: any;
    tokens: any;
    relationships: any[];
    issuer: string;
    // didDocument: HederaDidDocument;
}

/**
 * Custom logic block
 */
@BasicBlock({
    blockType: 'customLogicBlock',
    commonBlock: true,
    actionType: LocationType.REMOTE,
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
        properties: [
            {
                name: 'unsigned',
                label: 'Unsigned VC',
                title: 'Unsigned document',
                type: PropertyType.Checkbox
            },
            {
                name: 'passOriginal',
                label: 'Pass original',
                title: 'Pass original document',
                type: PropertyType.Checkbox
            }
        ]
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
        // console.log('Custom logic block');
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
            const triggerEvents = (documents: IPolicyDocument | IPolicyDocument[]) => {
                if (!documents) {
                    return;
                }
                event.data.data = documents;
                ref.triggerEvents(PolicyOutputEventType.RunEvent, event.user, event.data);
                ref.triggerEvents(PolicyOutputEventType.ReleaseEvent, event.user, null);
                ref.triggerEvents(PolicyOutputEventType.RefreshEvent, event.user, event.data);
                PolicyComponentsUtils.ExternalEventFn(new ExternalEvent(ExternalEventType.Run, ref, event?.user, {
                    documents: ExternalDocuments(event?.data?.data)
                }));
            }
            await this.execute(event.data, event.user, triggerEvents, event?.user?.userId);
            ref.backup();
        } catch (error) {
            ref.error(PolicyUtils.getErrorMessage(error));
        }
    }

    /**
     * Get sources
     * @param user
     * @param globalFilters
     * @protected
     */
    protected async getSources(user: PolicyUser): Promise<any[]> {
        const data = [];
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyCalculateBlock>(this);
        for (const child of ref.children) {
            if (child.blockClassName === 'SourceAddon') {
                const childData = await (child as IPolicyAddonBlock).getFromSource(user, null);
                for (const item of childData) {
                    data.push(item);
                }
            }
        }
        return data;
    }

    /**
     * Execute logic
     * @param state
     * @param user
     * @param triggerEvents
     * @param userId
     */
    execute(
        state: IPolicyEventState,
        user: PolicyUser,
        triggerEvents: (documents: IPolicyDocument | IPolicyDocument[]) => void,
        userId: string | null
    ): Promise<IPolicyDocument | IPolicyDocument[]> {
        return new Promise<IPolicyDocument | IPolicyDocument[]>(async (resolve, reject) => {
            try {
                const ref = PolicyComponentsUtils.GetBlockRef<IPolicyCalculateBlock>(this);
                let documents: IPolicyDocument[];
                if (Array.isArray(state.data)) {
                    documents = state.data;
                } else {
                    documents = [state.data];
                }

                let metadata: IMetadata;
                if (ref.options.unsigned) {
                    metadata = null;
                } else {
                    metadata = await this.aggregateMetadata(documents, user, ref, userId);
                }

                const done = async (result: any | any[], final: boolean) => {
                    if (!result) {
                        triggerEvents(null);
                        if (final) {
                            resolve(null);
                        }
                        return;
                    }
                    const processing = async (json: any): Promise<IPolicyDocument> => {
                        if (ref.options.passOriginal) {
                            return json;
                        }
                        if (ref.options.unsigned) {
                            return await this.createUnsignedDocument(json, ref);
                        } else {
                            return await this.createDocument(json, metadata, ref, userId);
                        }
                    }
                    if (Array.isArray(result)) {
                        const items: IPolicyDocument[] = [];
                        for (const r of result) {
                            items.push(await processing(r))
                        }
                        triggerEvents(items);
                        if (final) {
                            resolve(items);
                        }
                        return;
                    } else {
                        const item = await processing(result);
                        triggerEvents(item);
                        if (final) {
                            resolve(item);
                        }
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

                const sources: IPolicyDocument[] = await this.getSources(user);

                const importCode = `const [done, user, documents, mathjs, artifacts, formulajs, sources] = arguments;\r\n`;
                const expression = ref.options.expression || '';
                const worker = new Worker(path.join(path.dirname(filename), '..', 'helpers', 'custom-logic-worker.js'), {
                    workerData: {
                        execFunc: `${importCode}${execCode}${expression}`,
                        user,
                        documents,
                        artifacts,
                        sources
                    },
                });

                worker.on('error', (error) => {
                    reject(error);
                });
                worker.on('message', async (data) => {
                    try {
                        await done(data.result, data.final);
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
     * @param userId
     */
    private async aggregateMetadata(
        documents: IPolicyDocument | IPolicyDocument[],
        user: PolicyUser,
        ref: IPolicyCalculateBlock,
        userId: string | null
    ): Promise<IMetadata> {
        const isArray = Array.isArray(documents);
        const firstDocument = isArray ? documents[0] : documents;
        const owner = await PolicyUtils.getDocumentOwner(ref, firstDocument, userId);
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

        let issuer: string;
        switch (ref.options.documentSigner) {
            case 'owner':
                issuer = owner.did;
                break;
            case 'issuer':
                issuer = PolicyUtils.getDocumentIssuer(firstDocument.document);
                break;
            default:
                issuer = ref.policyOwner
                break;
        }

        return { owner, id, reference, accounts, tokens, relationships, issuer };
    }

    /**
     * Generate signed document
     * @param json
     * @param metadata
     * @param ref
     */
    private async createDocument(
        json: any,
        metadata: IMetadata,
        ref: IPolicyCalculateBlock,
        userId: string | null
    ): Promise<IPolicyDocument> {
        const {
            owner,
            id,
            reference,
            accounts,
            tokens,
            relationships,
            issuer
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

        const uuid = await ref.components.generateUUID();

        const newId = await PolicyActionsUtils.generateId(ref, ref.options.idType, owner, userId);
        if (newId) {
            vcSubject.id = newId;
        }

        const newVC = await PolicyActionsUtils.signVC(ref, vcSubject, issuer, { uuid }, userId);

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
}
