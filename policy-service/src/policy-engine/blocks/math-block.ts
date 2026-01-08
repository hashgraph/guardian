import { ArtifactType, IVC, LocationType, Schema, SchemaHelper } from '@guardian/interfaces';
import { ActionCallback, CalculateBlock } from '../helpers/decorators/index.js';
import { PolicyComponentsUtils } from '../policy-components-utils.js';
import { IPolicyCalculateBlock, IPolicyDocument, IPolicyEventState } from '../policy-engine.interface.js';
import { BlockActionError } from '../errors/index.js';
import { CatchErrors } from '../helpers/decorators/catch-errors.js';
import { ContextHelper, VcDocumentDefinition, VcHelper } from '@guardian/common';
// tslint:disable-next-line:no-duplicate-imports
import { VcDocument as VcDocumentCollection } from '@guardian/common';
import { IPolicyEvent, PolicyInputEventType, PolicyOutputEventType } from '../interfaces/index.js';
import { ChildrenType, ControlType, PropertyType } from '../interfaces/block-about.js';
import { PolicyUtils } from '../helpers/utils.js';
import { PolicyUser } from '../policy-user.js';
import { ExternalDocuments, ExternalEvent, ExternalEventType } from '../interfaces/external-event.js';

import { fileURLToPath } from 'url';
import { Worker } from 'node:worker_threads';
import path from 'path'
const filename = fileURLToPath(import.meta.url);

interface IMetadata {
    owner: PolicyUser;
    relayerAccount: string;
    id: string;
    reference: string;
    accounts: any;
    tokens: any;
    relationships: any[];
}

/**
 * Calculate block
 */
@CalculateBlock({
    blockType: 'mathBlock',
    commonBlock: true,
    actionType: LocationType.REMOTE,
    about: {
        label: 'Math',
        title: `Add 'Math' Block`,
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
            name: 'inputSchema',
            label: 'Input Schema',
            title: 'Input Schema',
            type: PropertyType.Schemas
        }, {
            name: 'outputSchema',
            label: 'Output Schema',
            title: 'Output Schema',
            type: PropertyType.Schemas
        }, {
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
export class MathBlock {
    private async createWorker(workerData: {
        expression: string,
        user: PolicyUser,
        artifacts: any[],
        document: any,
        schema: Schema,
        copy: boolean
    }): Promise<IPolicyDocument> {
        return new Promise<IPolicyDocument>(async (resolve, reject) => {
            const workerFile = path.join(path.dirname(filename), '..', 'helpers', 'workers', 'math-worker.js');
            const worker = new Worker(workerFile, { workerData });
            worker.on('error', (error) => {
                reject(error);
            });
            worker.on('message', async (data) => {
                try {
                    if (data?.type === 'done') {
                        resolve(data.result)
                    }
                } catch (error) {
                    reject(error);
                }
            });
        });
    }

    /**
     * Calculate data
     * @param ref 
     * @param document
     * @param user
     * @private
     */
    private async calculate(
        ref: IPolicyCalculateBlock,
        credentialSubject: any,
        user: PolicyUser
    ): Promise<any> {
        const outputSchema = await PolicyUtils.loadSchemaByID(ref, ref.options.outputSchema);
        const schema = new Schema(outputSchema);

        // Artifacts
        const files = Array.isArray(ref.options.artifacts) ? ref.options.artifacts : [];
        const artifacts = [];
        const jsonArtifacts = files.filter((file: any) => file.type === ArtifactType.JSON);
        for (const jsonArtifact of jsonArtifacts) {
            const artifactFile = await PolicyUtils.getArtifactFile(ref, jsonArtifact.uuid);
            artifacts.push(JSON.parse(artifactFile));
        }

        // Run
        const result = await this.createWorker({
            expression: ref.options.expression,
            document: credentialSubject,
            artifacts,
            user,
            schema,
            copy: !ref.options.outputSchema || ref.options.outputSchema === ref.options.inputSchema
        })

        return result;
    }

    /**
     * Process data
     * @param documents
     * @param ref
     * @param userId
     * @private
     */
    private async process(
        documents: IPolicyDocument,
        ref: IPolicyCalculateBlock,
        userId: string | null
    ): Promise<IPolicyDocument> {
        const context = await ref.debugContext({ documents });
        const contextDocuments = context.documents as IPolicyDocument;

        if (!contextDocuments) {
            throw new BlockActionError('Invalid VC', ref.blockType, ref.uuid);
        }

        const vc = VcDocumentDefinition.fromJsonTree(contextDocuments.document);
        const credentialSubject = vc.getCredentialSubject(0).toJsonTree();
        const docOwner = await PolicyUtils.getDocumentOwner(ref, contextDocuments, userId);

        const newJson = await this.calculate(ref, credentialSubject, docOwner);
        if (ref.options.unsigned) {
            return await this.createUnsignedDocument(newJson, ref);
        } else {
            const metadata = await this.aggregateMetadata(contextDocuments, ref, userId);
            return await this.createDocument(newJson, metadata, ref, userId);
        }
    }

    /**
     * Generate document metadata
     * @param documents
     * @param ref
     * @param userId
     */
    private async aggregateMetadata(
        documents: IPolicyDocument | IPolicyDocument[],
        ref: IPolicyCalculateBlock,
        userId: string | null
    ): Promise<IMetadata> {
        const isArray = Array.isArray(documents);
        const firstDocument = isArray ? documents[0] : documents;
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
        const owner = await PolicyUtils.getDocumentOwner(ref, firstDocument, userId);
        const relayerAccount = await PolicyUtils.getDocumentRelayerAccount(ref, firstDocument, userId);
        return { owner, relayerAccount, id, reference, accounts, tokens, relationships };
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
            relayerAccount,
            id,
            reference,
            accounts,
            tokens,
            relationships
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

        PolicyUtils.setGuardianVersion(vcSubject, outputSchema);

        if (reference) {
            vcSubject.ref = reference;
        }
        if (ref.dryRun) {
            VCHelper.addDryRunContext(vcSubject);
        }

        const schema = new Schema(outputSchema);
        ContextHelper.setContext(vcSubject, schema);
        ContextHelper.clearEmptyProperties(vcSubject);

        const uuid = await ref.components.generateUUID();
        const policyOwnerCred = await PolicyUtils.getUserCredentials(ref, ref.policyOwner, userId);
        const didDocument = await policyOwnerCred.loadDidDocument(ref, userId);
        const newVC = await VCHelper.createVerifiableCredential(
            vcSubject,
            didDocument,
            null,
            { uuid }
        );

        const item = PolicyUtils.createVC(ref, owner, newVC);
        item.type = outputSchema.iri;
        item.schema = outputSchema.iri;
        item.relationships = relationships.length ? relationships : null;
        item.accounts = accounts && Object.keys(accounts).length ? accounts : null;
        item.tokens = tokens && Object.keys(tokens).length ? tokens : null;
        item.relayerAccount = relayerAccount;
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
     * Run action callback
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

        if (Array.isArray(event.data.data)) {
            const result: IPolicyDocument[] = [];
            for (const doc of event.data.data) {
                const newVC = await this.process(doc, ref, event?.user?.userId);
                result.push(newVC)
            }
            event.data.data = result;
        } else {
            event.data.data = await this.process(event.data.data, ref, event?.user?.userId);
        }

        ref.triggerEvents(PolicyOutputEventType.RunEvent, event.user, event.data, event.actionStatus);
        ref.triggerEvents(PolicyOutputEventType.ReleaseEvent, event.user, null, event.actionStatus);
        ref.triggerEvents(PolicyOutputEventType.RefreshEvent, event.user, event.data, event.actionStatus);
        PolicyComponentsUtils.ExternalEventFn(new ExternalEvent(ExternalEventType.Run, ref, event.user, {
            documents: ExternalDocuments(event.data?.data)
        }));
        ref.backup();
    }
}
