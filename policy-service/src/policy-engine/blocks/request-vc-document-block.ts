import { CheckResult, LocationType, removeObjectProperties, Schema, SchemaHelper } from '@guardian/interfaces';
import { PolicyUtils } from '../helpers/utils.js';
import { BlockActionError } from '../errors/index.js';
import { ActionCallback, StateField } from '../helpers/decorators/index.js';
import { AnyBlockType, IPolicyDocument, IPolicyEventState, IPolicyGetData, IPolicyRequestBlock, IPolicyValidatorBlock } from '../policy-engine.interface.js';
import { IPolicyEvent, PolicyInputEventType, PolicyOutputEventType } from '../interfaces/index.js';
import { ChildrenType, ControlType } from '../interfaces/block-about.js';
import { EventBlock } from '../helpers/decorators/event-block.js';
import { VcDocument as VcDocumentCollection, VcHelper } from '@guardian/common';
import { PolicyComponentsUtils } from '../policy-components-utils.js';
import { PolicyUser } from '../policy-user.js';
import { ExternalDocuments, ExternalEvent, ExternalEventType } from '../interfaces/external-event.js';
import deepEqual from 'deep-equal';
import { PolicyActionsUtils } from '../policy-actions/utils.js';
import { hydrateTablesInObject, loadFileTextById } from '../helpers/table-field.js';

/**
 * Request VC document block
 */
@EventBlock({
    blockType: 'requestVcDocumentBlock',
    commonBlock: false,
    actionType: LocationType.REMOTE,
    about: {
        label: 'Request',
        title: `Add 'Request' Block`,
        post: true,
        get: true,
        children: ChildrenType.Special,
        control: ControlType.UI,
        input: [
            PolicyInputEventType.RunEvent,
            PolicyInputEventType.RefreshEvent,
            PolicyInputEventType.RestoreEvent
        ],
        output: [
            PolicyOutputEventType.RunEvent,
            PolicyOutputEventType.RefreshEvent,
            PolicyOutputEventType.ReferenceEvent,
            PolicyOutputEventType.DraftEvent
        ],
        defaultEvent: true
    },
    variables: [
        { path: 'options.schema', alias: 'schema', type: 'Schema' }
    ]
})
export class RequestVcDocumentBlock {
    /**
     * Block state
     */
    @StateField()
    public readonly state: { [key: string]: any } = { active: true };

    /**
     * Schema
     * @private
     */
    private _schema: Schema;

    /**
     * Before init callback
     */
    public async beforeInit(): Promise<void> {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyRequestBlock>(this);
        const schemaIRI = ref.options.schema;
        if (!schemaIRI) {
            throw new BlockActionError(
                `Schema IRI is empty`,
                ref.blockType,
                ref.uuid
            );
        }
        const schema = await PolicyUtils.loadSchemaByID(ref, schemaIRI);
        if (!schema) {
            throw new BlockActionError(
                `Can not find schema with IRI: ${schemaIRI}`,
                ref.blockType,
                ref.uuid
            );
        }
        this._schema = new Schema(schema);
    }

    /**
     * Get Validators
     */
    protected getValidators(): IPolicyValidatorBlock[] {
        const ref = PolicyComponentsUtils.GetBlockRef(this);
        const validators: IPolicyValidatorBlock[] = [];
        for (const child of ref.children) {
            if (child.blockClassName === 'ValidatorBlock') {
                validators.push(child as IPolicyValidatorBlock);
            }
        }
        return validators;
    }

    /**
     * Validate Documents
     * @param user
     * @param state
     */
    protected async validateDocuments(
        user: PolicyUser,
        state: IPolicyEventState
    ): Promise<string> {
        const validators = this.getValidators();
        for (const validator of validators) {
            const error = await validator.run({
                type: null,
                inputType: null,
                outputType: null,
                policyId: null,
                source: null,
                sourceId: null,
                target: null,
                targetId: null,
                user,
                data: state
            });
            if (error) {
                return error;
            }
        }
        return null;
    }

    /**
     * Get block data
     * @param user
     */
    async getData(user: PolicyUser): Promise<IPolicyGetData> {
        const options = PolicyComponentsUtils.GetBlockUniqueOptionsObject(this);
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyRequestBlock>(this);
        const sources = await ref.getSources(user);
        const restoreData = this.state[user.id] && this.state[user.id].restoreData;

        return {
            id: ref.uuid,
            blockType: ref.blockType,
            actionType: ref.actionType,
            readonly: (
                ref.actionType === LocationType.REMOTE &&
                user.location === LocationType.REMOTE
            ),
            schema: { ...this._schema, fields: [], conditions: [] },
            presetSchema: options.presetSchema,
            presetFields: options.presetFields,
            editType: options.editType || 'new',
            relayerAccount: !!options.relayerAccount,
            uiMetaData: options.uiMetaData || {},
            hideFields: options.hideFields || [],
            data: sources && sources.length && sources[0] || null,
            restoreData,
        };
    }

    /**
     * Get Relationships
     * @param ref
     * @param refId
     */
    private async getRelationships(ref: AnyBlockType, refId: any): Promise<VcDocumentCollection> {
        try {
            return await PolicyUtils.getRelationships(ref, ref.policyId, refId);
        } catch (error) {
            ref.error(PolicyUtils.getErrorMessage(error));
            throw new BlockActionError('Invalid relationships', ref.blockType, ref.uuid);
        }
    }

    /**
     * Set block data
     * @param user
     * @param data
     */
    @ActionCallback({
        output: [PolicyOutputEventType.RunEvent, PolicyOutputEventType.RefreshEvent]
    })
    async setData(user: PolicyUser, data: IPolicyDocument, _, actionStatus): Promise<any> {
        if (this.state.hasOwnProperty(user.id)) {
            delete this.state[user.id].restoreData;
        }

        if (!user.did) {
            const ref = PolicyComponentsUtils.GetBlockRef<IPolicyRequestBlock>(this);
            throw new BlockActionError('User have no any did.', ref.blockType, ref.uuid);
        }
        return await this.setBlockData(user, data, actionStatus);
    }

    private async setBlockData(user: PolicyUser, data: IPolicyDocument, actionStatus: any) {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyRequestBlock>(this);
        try {
            //Prepare data
            const document = await this.prepareDocument(data);
            const draft = data.draft;
            const draftId = data.draftId;
            const editType = ref.options.editType;

            const documentRef = await this.getRelationships(ref, data.ref);

            //Relayer Account
            const relayerAccount = await PolicyUtils.getRelayerAccount(ref, user.did, data.relayerAccount, documentRef, user.userId);

            //Prepare Credential Subject
            const credentialSubject = await this.createCredentialSubject(user, relayerAccount, document);

            //Get relationships
            if (documentRef) {
                credentialSubject.ref = PolicyUtils.getSubjectId(documentRef);
                if (!credentialSubject.ref) {
                    throw new BlockActionError('Reference document not found.', ref.blockType, ref.uuid);
                }
            }

            //Validate preset
            const presetCheck = await this.checkPreset(ref, document, documentRef)
            if (!presetCheck.valid) {
                throw new BlockActionError(
                    JSON.stringify(presetCheck.error),
                    ref.blockType,
                    ref.uuid
                );
            }

            //Validate
            if (!draft) {
                const _vcHelper = new VcHelper();
                const res = await _vcHelper.verifySubject(credentialSubject);
                if (!res.ok) {
                    throw new BlockActionError(JSON.stringify(res.error), ref.blockType, ref.uuid);
                }
            }

            //Create Verifiable Credential
            const item = await this.createVerifiableCredential(user, relayerAccount, credentialSubject, actionStatus?.id);
            PolicyUtils.setDocumentRef(item, documentRef);

            //Update metadata
            item.draft = draft;
            item.draftId = draftId;
            if (draft) {
                item.draftRef = credentialSubject?.ref;
            }
            if (editType === 'edit') {
                item.startMessageId = documentRef?.startMessageId;
            }

            const state: IPolicyEventState = {
                data: item
            };
            if (editType === 'edit') {
                state.old = documentRef;
            }

            //Validate
            if (!draft) {
                const error = await this.validateDocuments(user, state);
                if (error) {
                    throw new BlockActionError(error, ref.blockType, ref.uuid);
                }
            }

            //Trigger Events
            if (draft) {
                ref.triggerEvents(PolicyOutputEventType.DraftEvent, user, state, actionStatus);
            } else {
                ref.triggerEvents(PolicyOutputEventType.RunEvent, user, state, actionStatus);
            }
            if (draft || editType === 'edit') {
                ref.triggerEvents(PolicyOutputEventType.ReferenceEvent, user, { data: documentRef }, actionStatus);
            }
            ref.triggerEvents(PolicyOutputEventType.ReleaseEvent, user, null, actionStatus);
            ref.triggerEvents(PolicyOutputEventType.RefreshEvent, user, state, actionStatus);
            PolicyComponentsUtils.ExternalEventFn(new ExternalEvent(ExternalEventType.Set, ref, user, {
                documents: ExternalDocuments(item)
            }));

            //Backup
            ref.backup();
            return item;
        } catch (error) {
            ref.error(`setData: ${PolicyUtils.getErrorMessage(error)}`);
            throw new BlockActionError(error, ref.blockType, ref.uuid);
        }
    }

    /**
     * Save data to restore
     * @param event Event
     * @returns
     */
    @ActionCallback({
        type: PolicyInputEventType.RestoreEvent
    })
    async restoreAction(event: IPolicyEvent<IPolicyEventState>) {
        const user = event?.user;
        const vcDocument = event?.data?.data;
        if (!vcDocument || !user) {
            return;
        }
        let blockState: any;
        if (!this.state.hasOwnProperty(user.id)) {
            blockState = {};
            this.state[user.id] = blockState;
        } else {
            blockState = this.state[user.id];
        }
        blockState.restoreData = vcDocument;
    }

    /**
     * Check modified readonly fields
     * @param ref
     * @param document Current document
     * @param documentRef Preset document
     */
    private async checkPreset(
        ref: AnyBlockType,
        document: any,
        documentRef: VcDocumentCollection
    ): Promise<CheckResult> {
        if (
            ref.options.presetFields &&
            ref.options.presetFields.length &&
            ref.options.presetSchema
        ) {
            const readonly = ref.options.presetFields.filter(
                (item: any) => item.readonly && item.value
            );
            if (!readonly.length || !document || !documentRef) {
                return { valid: true };
            }

            const presetDocument =
                PolicyUtils.getCredentialSubject(documentRef);
            if (!presetDocument) {
                return {
                    error: 'Readonly preset fields can not be verified.',
                    valid: false,
                };
            }

            const presetDocumentCopy = removeObjectProperties(
                ['@context'],
                JSON.parse(JSON.stringify(presetDocument))
            );
            for (const field of readonly) {
                if (
                    !deepEqual(
                        document[field.name],
                        presetDocumentCopy[field.value]
                    )
                ) {
                    return {
                        error: `Readonly preset field (${field.name}) can not be modified.`,
                        valid: false,
                    };
                }
            }
        }

        return { valid: true };
    }

    private async prepareDocument(data: IPolicyDocument): Promise<any> {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyRequestBlock>(this);

        const document = data.document;

        if (!document) {
            throw new BlockActionError('Invalid document.', ref.blockType, ref.uuid);
        }

        const disposeTables = await hydrateTablesInObject(
            document,
            async (fileId: string) => loadFileTextById(ref, fileId),
        );

        PolicyUtils.setAutoCalculateFields(this._schema, document);

        disposeTables();

        return document;
    }

    private async createCredentialSubject(
        user: PolicyUser,
        relayerAccount: string,
        document: any
    ): Promise<any> {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyRequestBlock>(this);

        SchemaHelper.updateObjectContext(this._schema, document);

        const _vcHelper = new VcHelper();
        const idType = ref.options.idType;

        const credentialSubject = document;
        credentialSubject.policyId = ref.policyId;

        PolicyUtils.setGuardianVersion(credentialSubject, this._schema);

        const newId = await PolicyActionsUtils.generateId({
            ref,
            type: idType,
            user,
            relayerAccount,
            userId: user.userId
        });
        if (newId) {
            credentialSubject.id = newId;
        }

        if (ref.dryRun) {
            _vcHelper.addDryRunContext(credentialSubject);
        }

        return credentialSubject;
    }

    private async createVerifiableCredential(
        user: PolicyUser,
        relayerAccount: string,
        credentialSubject: any,
        actionStatusId: any
    ): Promise<IPolicyDocument> {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyRequestBlock>(this);

        const groupContext = await PolicyUtils.getGroupContext(ref, user);
        const uuid = await ref.components.generateUUID();

        const vc = await PolicyActionsUtils.signVC({
            ref,
            subject: credentialSubject,
            issuer: user.did,
            relayerAccount,
            options: { uuid, group: groupContext },
            userId: user.userId
        });
        const item = PolicyUtils.createVC(ref, user, vc, actionStatusId);

        const accounts = PolicyUtils.getHederaAccounts(vc, relayerAccount, this._schema);
        const schemaIRI = ref.options.schema;
        item.type = schemaIRI;
        item.schema = schemaIRI;
        item.accounts = accounts;
        item.relayerAccount = relayerAccount;
        return item;
    }
}
