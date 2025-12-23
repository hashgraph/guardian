import { IPolicyEvent, PolicyInputEventType, PolicyOutputEventType } from '../interfaces/index.js';
import { ChildrenType, ControlType, PropertyType } from '../interfaces/block-about.js';
import { PolicyComponentsUtils } from '../policy-components-utils.js';
import { ActionCallback, BasicBlock } from '../helpers/decorators/index.js';
import { IPolicyBlock, IPolicyDocument, IPolicyEventState } from '../policy-engine.interface.js';
import { CatchErrors } from '../helpers/decorators/catch-errors.js';
import { PolicyUtils } from '../helpers/utils.js';
import { PolicyUser, UserCredentials } from '../policy-user.js';
import {
    SplitDocuments,
    Schema as SchemaCollection,
    VcHelper,
    VcDocumentDefinition as VcDocument,
} from '@guardian/common';
import { LocationType, SchemaEntity } from '@guardian/interfaces';
import { BlockActionError } from '../errors/index.js';
import { ExternalDocuments, ExternalEvent, ExternalEventType } from '../interfaces/external-event.js';
import { Inject } from '../../helpers/decorators/inject.js';
import { RecordActionStep } from '../record-action-step.js';

/**
 * Split block
 */
@BasicBlock({
    blockType: 'splitBlock',
    commonBlock: false,
    actionType: LocationType.REMOTE,
    about: {
        label: 'Split Block',
        title: `Add 'Split' Block`,
        post: false,
        get: false,
        children: ChildrenType.None,
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
            name: 'threshold',
            label: 'Threshold',
            title: 'Threshold',
            type: PropertyType.Input
        }, {
            name: 'sourceField',
            label: 'Source field',
            title: 'Source field',
            type: PropertyType.Path
        }]
    },
    variables: []
})
export class SplitBlock {
    /**
     * VC helper
     * @private
     */
    @Inject()
    declare private vcHelper: VcHelper;

    /**
     * Schema
     * @private
     */
    private schema: SchemaCollection | null;

    /**
     * Get Schema
     */
    async getSchema(): Promise<SchemaCollection> {
        if (!this.schema) {
            const ref = PolicyComponentsUtils.GetBlockRef<IPolicyBlock>(this);
            this.schema = await PolicyUtils.loadSchemaByType(ref, SchemaEntity.CHUNK);
            if (!this.schema) {
                throw new BlockActionError('Waiting for schema', ref.blockType, ref.uuid);
            }
        }
        return this.schema;
    }

    /**
     * Get value
     * @param ref
     * @param doc
     */
    private async calcDocValue(ref: IPolicyBlock, doc: IPolicyDocument): Promise<number> {
        try {
            const value = PolicyUtils.getObjectValue<any>(doc, ref.options.sourceField);
            return parseFloat(value);
        } catch (error) {
            return 0;
        }
    }

    /**
     * Create New Doc
     * @param ref
     * @param root
     * @param document
     * @param newValue
     * @param chunkNumber
     * @param maxChunks
     * @param sourceValue
     * @param threshold
     * @param userId
     */
    private async createNewDoc(
        ref: IPolicyBlock,
        root: UserCredentials,
        document: IPolicyDocument,
        newValue: number,
        chunkNumber: number,
        maxChunks: number,
        sourceValue: number,
        threshold: number,
        userId: string | null,
        actionStatusId: string,
    ): Promise<IPolicyDocument> {
        let clone = PolicyUtils.cloneVC(ref, document);
        PolicyUtils.setObjectValue(clone, ref.options.sourceField, newValue);
        let vc = VcDocument.fromJsonTree(clone.document);
        if (document.messageId) {
            const evidenceSchema = await this.getSchema();
            const context = PolicyUtils.getSchemaContext(ref, evidenceSchema);
            vc.addType(evidenceSchema.name);
            vc.addContext(context);
            vc.addEvidence({
                type: ['SourceDocument'],
                messageId: document.messageId,
                sourceField: ref.options.sourceField,
                sourceValue,
                threshold,
                chunkNumber,
                maxChunks
            });
        }
        const uuid = await ref.components.generateUUID(actionStatusId);
        const didDocument = await root.loadDidDocument(ref, userId);
        vc = await this.vcHelper.issueVerifiableCredential(
            vc,
            didDocument,
            null,
            { uuid }
        );
        clone.document = vc.toJsonTree();
        clone.hash = vc.toCredentialHash();
        clone.relayerAccount = document.relayerAccount;
        clone = PolicyUtils.setDocumentRef(clone, document) as any;
        return clone;
    }

    /**
     * Split Doc
     * @param ref
     * @param root
     * @param user
     * @param result
     * @param residue
     * @param document
     * @param userId
     */
    private async split(
        ref: IPolicyBlock,
        root: UserCredentials,
        user: PolicyUser,
        result: SplitDocuments[][],
        residue: SplitDocuments[],
        document: IPolicyDocument,
        userId: string | null,
        actionStatusId: string
    ) {
        const threshold = parseFloat(ref.options.threshold);
        const value = await this.calcDocValue(ref, document);

        let sum = 0;
        for (const item of residue) {
            sum += item.value;
        }

        let needed = threshold - sum;
        if (needed <= 0) {
            result.push(residue);
            residue = [];
            needed = threshold;
        }

        if (value < needed) {
            const maxChunks = 1;
            const newDoc = await this.createNewDoc(
                ref, root, document, value, maxChunks, maxChunks, value, threshold, userId, actionStatusId
            );
            residue.push(ref.databaseServer.createResidue(
                ref.policyId,
                ref.uuid,
                user.id,
                value,
                newDoc
            ));
        } else {
            const count = Math.floor((value - needed) / threshold);
            const end = value - needed - (count * threshold);
            const maxChunks = (count > 0 ? count : 0) + (end > 0 ? 1 : 0) + 1;

            const newDoc1 = await this.createNewDoc(
                ref, root, document, needed, 1, maxChunks, value, threshold, userId, actionStatusId
            );
            residue.push(ref.databaseServer.createResidue(
                ref.policyId,
                ref.uuid,
                user.id,
                needed,
                newDoc1
            ));
            result.push(residue);
            residue = [];

            if (count > 0) {
                for (let i = 0; i < count; i++) {
                    const newDocN = await this.createNewDoc(
                        ref, root, document, threshold, i + 2, maxChunks, value, threshold, userId, actionStatusId
                    );
                    result.push([ref.databaseServer.createResidue(
                        ref.policyId,
                        ref.uuid,
                        user.id,
                        threshold,
                        newDocN
                    )]);
                }
            }
            if (end > 0) {
                const newDocL = await this.createNewDoc(
                    ref, root, document, end, maxChunks, maxChunks, value, threshold, userId, actionStatusId
                );
                residue.push(ref.databaseServer.createResidue(
                    ref.policyId,
                    ref.uuid,
                    user.id,
                    end,
                    newDocL
                ));
            }
        }
        return residue;
    }

    /**
     * Add Docs
     * @param ref
     * @param user
     * @param documents
     * @param userId
     */
    private async addDocs(ref: IPolicyBlock, user: PolicyUser, documents: IPolicyDocument[], userId: string | null, actionStatus: RecordActionStep) {
        const residue = await ref.databaseServer.getResidue(ref.policyId, ref.uuid, user.id);
        const root = await PolicyUtils.getUserCredentials(ref, ref.policyOwner, userId);

        let current = residue;

        const data: SplitDocuments[][] = [];
        for (const document of documents) {
            current = await this.split(ref, root, user, data, current, document, userId, actionStatus?.id);
        }

        await ref.databaseServer.removeResidue(residue);
        await ref.databaseServer.setResidue(current);

        for (const chunk of data) {
            const state: IPolicyEventState = {
                data: chunk.map(c => {
                    delete c.document.id;
                    delete c.document._id;
                    return c.document;
                })
            };
            await ref.triggerEvents(PolicyOutputEventType.RunEvent, user, state, actionStatus);
            PolicyComponentsUtils.ExternalEventFn(new ExternalEvent(ExternalEventType.Chunk, ref, user, {
                documents: ExternalDocuments(state.data)
            }));
        }
        await ref.triggerEvents(PolicyOutputEventType.RefreshEvent, user, { data: documents }, actionStatus);
    }

    /**
     * Run block action
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
    async runAction(event: IPolicyEvent<IPolicyEventState>) {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyBlock>(this);
        ref.log(`runAction`);
        const docs: IPolicyDocument | IPolicyDocument[] = event.data.data;
        PolicyComponentsUtils.ExternalEventFn(new ExternalEvent(ExternalEventType.Run, ref, event?.user, {
            documents: ExternalDocuments(docs)
        }));
        if (Array.isArray(docs)) {
            await this.addDocs(ref, event.user, docs, event?.user?.userId, event.actionStatus);
        } else {
            await this.addDocs(ref, event.user, [docs], event?.user?.userId, event.actionStatus);
        }

        ref.backup();
    }
}
