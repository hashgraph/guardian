import { KeyType } from '@helpers/wallet';
import { DidDocumentStatus, GenerateUUIDv4, Schema } from '@guardian/interfaces';
import { PolicyUtils } from '@policy-engine/helpers/utils';
import { BlockActionError } from '@policy-engine/errors';
import { PolicyValidationResultsContainer } from '@policy-engine/policy-validation-results-container';
import { ActionCallback, StateField } from '@policy-engine/helpers/decorators';
import { AnyBlockType, IPolicyRequestBlock, IPolicyValidatorBlock } from '@policy-engine/policy-engine.interface';
import { PolicyInputEventType, PolicyOutputEventType } from '@policy-engine/interfaces';
import { ChildrenType, ControlType } from '@policy-engine/interfaces/block-about';
import { EventBlock } from '@policy-engine/helpers/decorators/event-block';
import { DIDDocument, DIDMessage, MessageAction, MessageServer } from '@hedera-modules';
import { VcHelper } from '@helpers/vc-helper';
import { VcDocument as VcDocumentCollection } from '@entity/vc-document';
import { PolicyComponentsUtils } from '@policy-engine/policy-components-utils';
import { IPolicyUser } from '@policy-engine/policy-user';

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
        ],
        output: [
            PolicyOutputEventType.RunEvent,
            PolicyOutputEventType.RefreshEvent
        ],
        defaultEvent: true
    }
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
    protected async validateDocuments(user: IPolicyUser, state: any): Promise<boolean> {
        const validators = this.getValidators();
        for (const validator of validators) {
            const valid = await validator.run({
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
            if (!valid) {
                return false;
            }
        }
        return true;
    }

    /**
     * Change active
     * @param user
     * @param active
     */
    @ActionCallback({
        output: PolicyOutputEventType.RefreshEvent
    })
    async changeActive(user: IPolicyUser, active: boolean) {
        const ref = PolicyComponentsUtils.GetBlockRef(this);
        let blockState: any;
        if (!this.state.hasOwnProperty(user.did)) {
            blockState = {};
            this.state[user.did] = blockState;
        } else {
            blockState = this.state[user.did];
        }
        blockState.active = active;

        ref.updateBlock(blockState, user);
        ref.triggerEvents(PolicyOutputEventType.RefreshEvent, user, null);
    }

    /**
     * Get active
     * @param user
     */
    getActive(user: IPolicyUser) {
        let blockState: any;
        if (!this.state.hasOwnProperty(user.did)) {
            blockState = {};
            this.state[user.did] = blockState;
        } else {
            blockState = this.state[user.did];
        }
        if (blockState.active === undefined) {
            blockState.active = true;
        }
        return blockState.active;
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

        return {
            id: ref.uuid,
            blockType: ref.blockType,
            schema,
            presetSchema: options.presetSchema,
            presetFields: options.presetFields,
            uiMetaData: options.uiMetaData || {},
            hideFields: options.hideFields || [],
            active: this.getActive(user),
            data: sources && sources.length && sources[0] || null
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
            ref.error(error.message);
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
    async setData(user: IPolicyUser, _data: any): Promise<any> {
        const ref = PolicyComponentsUtils.GetBlockRef(this);
        ref.log(`setData`);

        if (!user.did) {
            throw new BlockActionError('User have no any did', ref.blockType, ref.uuid);
        }

        const active = this.getActive(user);
        if (!active) {
            throw new BlockActionError('Block not available', ref.blockType, ref.uuid);
        }

        try {
            await this.changeActive(user, false);

            const hederaAccount = await PolicyUtils.getHederaAccount(ref, user.did);

            const document = _data.document;
            const documentRef = await this.getRelationships(ref, _data.ref);

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

            const vc = await _vcHelper.createVC(user.did, hederaAccount.hederaAccountKey, credentialSubject);
            const accounts = PolicyUtils.getHederaAccounts(vc, hederaAccount.hederaAccountId, schema);
            const item = ref.databaseServer.createVCRecord(
                ref.policyId,
                ref.tag,
                null,
                vc,
                {
                    type: schemaIRI,
                    owner: user.did,
                    schema: schemaIRI,
                    accounts
                },
                documentRef
            )

            const state = { data: item };

            const valid = await this.validateDocuments(user, state);
            if (!valid) {
                throw new BlockActionError('Invalid document', ref.blockType, ref.uuid);
            }

            await this.changeActive(user, true);
            ref.triggerEvents(PolicyOutputEventType.RunEvent, user, state);
            ref.triggerEvents(PolicyOutputEventType.RefreshEvent, user, state);
        } catch (error) {
            ref.error(`setData: ${error.message}`);
            await this.changeActive(user, true);
            throw new BlockActionError(error, ref.blockType, ref.uuid);
        }

        return {};
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

                await ref.databaseServer.saveDid({
                    did,
                    document,
                    status: DidDocumentStatus.CREATE,
                    messageId: messageResult.getId(),
                    topicId: messageResult.getTopicId()
                } as any);

                await PolicyUtils.setAccountKey(ref, user.did, KeyType.KEY, did, key);
                return did;
            }
            if (idType === 'OWNER') {
                return user.did;
            }
            return undefined;
        } catch (error) {
            ref.error(`generateId: ${idType} : ${error.message}`);
            throw new BlockActionError(error, ref.blockType, ref.uuid);
        }
    }

    /**
     * Validate block data
     * @param resultsContainer
     */
    public async validate(resultsContainer: PolicyValidationResultsContainer): Promise<void> {
        const ref = PolicyComponentsUtils.GetBlockRef(this);
        try {
            // Test schema options
            if (!ref.options.schema) {
                resultsContainer.addBlockError(ref.uuid, 'Option "schema" does not set');
                return;
            }
            if (typeof ref.options.schema !== 'string') {
                resultsContainer.addBlockError(ref.uuid, 'Option "schema" must be a string');
                return;
            }
            const schema = await ref.databaseServer.getSchemaByIRI(ref.options.schema, ref.topicId);
            if (!schema) {
                resultsContainer.addBlockError(ref.uuid, `Schema with id "${ref.options.schema}" does not exist`);
                return;
            }
            if (ref.options.presetSchema) {
                const presetSchema = await ref.databaseServer.getSchemaByIRI(ref.options.presetSchema, ref.topicId);
                if (!presetSchema) {
                    resultsContainer.addBlockError(ref.uuid, `Schema with id "${ref.options.presetSchema}" does not exist`);
                    return;
                }
            }
        } catch (error) {
            resultsContainer.addBlockError(ref.uuid, `Unhandled exception ${error.message}`);
        }
    }
}
