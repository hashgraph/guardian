import { GenerateUUIDv4, Schema } from '@guardian/interfaces';
import { PolicyUtils } from '@policy-engine/helpers/utils';
import { BlockActionError } from '@policy-engine/errors';
import { ActionCallback, StateField } from '@policy-engine/helpers/decorators';
import { AnyBlockType, IPolicyDocument, IPolicyEventState, IPolicyRequestBlock, IPolicyValidatorBlock } from '@policy-engine/policy-engine.interface';
import { IPolicyEvent, PolicyInputEventType, PolicyOutputEventType } from '@policy-engine/interfaces';
import { ChildrenType, ControlType } from '@policy-engine/interfaces/block-about';
import { EventBlock } from '@policy-engine/helpers/decorators/event-block';
import {
    VcDocument as VcDocumentCollection,
    DIDDocument,
    DIDMessage,
    MessageAction,
    MessageServer,
    KeyType,
    VcHelper,
} from '@guardian/common';
import { PolicyComponentsUtils } from '@policy-engine/policy-components-utils';
import { IPolicyUser } from '@policy-engine/policy-user';
import { ExternalDocuments, ExternalEvent, ExternalEventType } from '@policy-engine/interfaces/external-event';
import deepEqual from 'deep-equal';

/**
 * Request VC document block
 */
@EventBlock({
    blockType: 'requestVcDocumentBlock',
    commonBlock: false,
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
            PolicyOutputEventType.RefreshEvent
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
    private schema: Schema | null;

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
    protected async validateDocuments(user: IPolicyUser, state: any): Promise<string> {
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
     * Get Schema
     */
    async getSchema(): Promise<Schema> {
        if (!this.schema) {
            const ref = PolicyComponentsUtils.GetBlockRef<IPolicyRequestBlock>(this);
            const schema = await ref.databaseServer.getSchemaByIRI(ref.options.schema, ref.topicId);
            this.schema = schema ? new Schema(schema) : null;
            if (!this.schema) {
                throw new BlockActionError('Waiting for schema', ref.blockType, ref.uuid);
            }
        }
        return this.schema;
    }

    /**
     * Get block data
     * @param user
     */
    async getData(user: IPolicyUser): Promise<any> {
        const options = PolicyComponentsUtils.GetBlockUniqueOptionsObject(this);
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyRequestBlock>(this);

        const schema = await this.getSchema();
        const sources = await ref.getSources(user);
        const restoreData = this.state[user.id] && this.state[user.id].restoreData;

        return {
            id: ref.uuid,
            blockType: ref.blockType,
            schema,
            presetSchema: options.presetSchema,
            presetFields: options.presetFields,
            uiMetaData: options.uiMetaData || {},
            hideFields: options.hideFields || [],
            data: sources && sources.length && sources[0] || null,
            restoreData
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
     * @param _data
     */
    @ActionCallback({
        output: [PolicyOutputEventType.RunEvent, PolicyOutputEventType.RefreshEvent]
    })
    async setData(user: IPolicyUser, _data: IPolicyDocument): Promise<any> {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyRequestBlock>(this);
        ref.log(`setData`);

        if (this.state.hasOwnProperty(user.id)) {
            delete this.state[user.id].restoreData;
        }

        if (!user.did) {
            throw new BlockActionError('User have no any did', ref.blockType, ref.uuid);
        }

        try {
            const hederaAccount = await PolicyUtils.getHederaAccount(ref, user.did);

            const document = _data.document;
            const documentRef = await this.getRelationships(ref, _data.ref);
            await this.checkPreset(ref, document, documentRef);

            const credentialSubject = document;
            const schemaIRI = ref.options.schema;
            const idType = ref.options.idType;

            const schema = await this.getSchema();

            const id = await this.generateId(
                idType, user, hederaAccount.hederaAccountId, hederaAccount.hederaAccountKey
            );
            const _vcHelper = new VcHelper();

            if (id) {
                credentialSubject.id = id;
            }

            if (documentRef) {
                credentialSubject.ref = PolicyUtils.getSubjectId(documentRef);
            }

            credentialSubject.policyId = ref.policyId;

            if (ref.dryRun) {
                _vcHelper.addDryRunContext(credentialSubject);
            }

            const res = await _vcHelper.verifySubject(credentialSubject);

            if (!res.ok) {
                throw new BlockActionError(JSON.stringify(res.error), ref.blockType, ref.uuid);
            }

            const groupContext = await PolicyUtils.getGroupContext(ref, user);
            const vc = await _vcHelper.createVC(
                user.did,
                hederaAccount.hederaAccountKey,
                credentialSubject,
                groupContext
            );
            const accounts = PolicyUtils.getHederaAccounts(vc, hederaAccount.hederaAccountId, schema);

            let item = PolicyUtils.createVC(ref, user, vc);
            item.type = schemaIRI;
            item.schema = schemaIRI;
            item.accounts = accounts;
            item = PolicyUtils.setDocumentRef(item, documentRef);

            const state = { data: item };

            const error = await this.validateDocuments(user, state);
            if (error) {
                throw new BlockActionError(error, ref.blockType, ref.uuid);
            }
            ref.triggerEvents(PolicyOutputEventType.RunEvent, user, state);
            ref.triggerEvents(PolicyOutputEventType.ReleaseEvent, user, null);
            ref.triggerEvents(PolicyOutputEventType.RefreshEvent, user, state);

            PolicyComponentsUtils.ExternalEventFn(new ExternalEvent(ExternalEventType.Set, ref, user, {
                documents: ExternalDocuments(item)
            }));

            return item;
        } catch (error) {
            ref.error(`setData: ${PolicyUtils.getErrorMessage(error)}`);
            throw new BlockActionError(error, ref.blockType, ref.uuid);
        }

        return {};
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

                const didObject = await DIDDocument.create(null, topic.topicId);
                const did = didObject.getDid();
                const key = didObject.getPrivateKeyString();

                const message = new DIDMessage(MessageAction.CreateDID);
                message.setDocument(didObject);

                const client = new MessageServer(userHederaAccount, userHederaKey, ref.dryRun);
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

    /**
     * Check modified readonly fields
     * @param ref
     * @param document Current document
     * @param documentRef Preset document
     */
    private async checkPreset(ref: AnyBlockType, document: any, documentRef: VcDocumentCollection) {
        if (ref.options.presetFields && ref.options.presetFields.length && ref.options.presetSchema) {
            const readonly = ref.options.presetFields.filter((item: any) => item.readonly && item.value);
            if (readonly.length && document && documentRef) {
                const presetDocument = PolicyUtils.getCredentialSubject(documentRef);
                if (!presetDocument) {
                    throw new BlockActionError(`Readonly preset fields can not be verified.`, ref.blockType, ref.uuid);
                }
                for (const field of readonly) {
                    if (!deepEqual(presetDocument[field.value], document[field.name])) {
                        throw new BlockActionError(`Readonly preset field (${field.name}) can not be modified.`, ref.blockType, ref.uuid);
                    }
                }
            }
        }
    }
}
