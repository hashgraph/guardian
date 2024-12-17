import {
    ActionCallback,
    EventBlock,
} from '../helpers/decorators/index.js';
import { PolicyComponentsUtils } from '../policy-components-utils.js';
import {
    AnyBlockType,
    IPolicyAddonBlock,
    IPolicyDocument,
    IPolicyEventState,
    IPolicyRequestBlock,
    IPolicySourceBlock,
    IPolicyValidatorBlock,
} from '../policy-engine.interface.js';
import { ChildrenType, ControlType } from '../interfaces/block-about.js';
import { PolicyUser, UserCredentials } from '../policy-user.js';
import {
    VcHelper,
    DIDMessage,
    MessageAction,
    MessageServer,
    VcDocument as VcDocumentCollection,
} from '@guardian/common';
import {
    Schema,
    SchemaHelper,
    CheckResult,
    removeObjectProperties,
} from '@guardian/interfaces';
import { BlockActionError } from '../errors/block-action-error.js';
import { PolicyUtils } from '../helpers/utils.js';
import { PolicyOutputEventType } from '../interfaces/policy-event-type.js';
import deepEqual from 'deep-equal';

/**
 * Request VC document block addon with UI
 */
@EventBlock({
    blockType: 'requestVcDocumentBlockAddon',
    commonBlock: false,
    about: {
        label: 'Request',
        title: `Add 'Request' Block`,
        post: true,
        get: true,
        children: ChildrenType.Special,
        control: ControlType.UI,
        input: null,
        output: null,
        defaultEvent: false,
    },
    variables: [{ path: 'options.schema', alias: 'schema', type: 'Schema' }],
})
export class RequestVcDocumentBlockAddon {
    /**
     * Schema
     * @private
     */
    private _schema: Schema;

    /**
     * Before init callback
     */
    public async beforeInit(): Promise<void> {
        const ref =
            PolicyComponentsUtils.GetBlockRef<IPolicyRequestBlock>(this);
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
                data: state,
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
    async getData(user: PolicyUser): Promise<any> {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyAddonBlock>(this);
        const data: any = {
            id: ref.uuid,
            blockType: ref.blockType,
            ...ref.options,
            schema: { ...this._schema, fields: [], conditions: [] },
        };
        return data;
    }

    /**
     * Set block data
     * @param user
     * @param _data
     */
    @ActionCallback({
        output: [
            PolicyOutputEventType.RunEvent,
            PolicyOutputEventType.RefreshEvent,
        ],
    })
    async setData(user: PolicyUser, _data: IPolicyDocument): Promise<any> {
        const ref =
            PolicyComponentsUtils.GetBlockRef<IPolicyRequestBlock>(this);

        const parent =
            PolicyComponentsUtils.GetBlockRef<IPolicySourceBlock>(ref.parent);

        await parent.onAddonEvent(
            user,
            ref.tag,
            _data.ref.id,
            async (documentRef: any) => {
                if (!user.did) {
                    throw new BlockActionError(
                        'User have no any did.',
                        ref.blockType,
                        ref.uuid
                    );
                }
                const document = _data.document;
                const presetCheck = await this.checkPreset(
                    ref,
                    document,
                    documentRef
                );
                if (!presetCheck.valid) {
                    throw new BlockActionError(
                        JSON.stringify(presetCheck.error),
                        ref.blockType,
                        ref.uuid
                    );
                }

                SchemaHelper.updateObjectContext(this._schema, document);

                const _vcHelper = new VcHelper();
                const idType = ref.options.idType;
                const userCred = await PolicyUtils.getUserCredentials(
                    ref,
                    user.did
                );
                const didDocument = await userCred.loadDidDocument(ref);

                const id = await this.generateId(idType, user, userCred);
                const credentialSubject = document;
                credentialSubject.policyId = ref.policyId;
                if (id) {
                    credentialSubject.id = id;
                }

                credentialSubject.ref = PolicyUtils.getSubjectId(documentRef);
                if (!credentialSubject.ref) {
                    throw new BlockActionError(
                        'Reference document not found.',
                        ref.blockType,
                        ref.uuid
                    );
                }
                if (ref.dryRun) {
                    _vcHelper.addDryRunContext(credentialSubject);
                }

                const res = await _vcHelper.verifySubject(credentialSubject);
                if (!res.ok) {
                    throw new BlockActionError(
                        JSON.stringify(res.error),
                        ref.blockType,
                        ref.uuid
                    );
                }

                const groupContext = await PolicyUtils.getGroupContext(
                    ref,
                    user
                );
                const uuid = await ref.components.generateUUID();
                const vc = await _vcHelper.createVerifiableCredential(
                    credentialSubject,
                    didDocument,
                    null,
                    { uuid, group: groupContext }
                );
                let item = PolicyUtils.createVC(ref, user, vc);

                const accounts = PolicyUtils.getHederaAccounts(
                    vc,
                    userCred.hederaAccountId,
                    this._schema
                );
                const schemaIRI = ref.options.schema;
                item.type = schemaIRI;
                item.schema = schemaIRI;
                item.accounts = accounts;
                item = PolicyUtils.setDocumentRef(item, documentRef);
                
                const state: IPolicyEventState = { data: item };
                const error = await this.validateDocuments(user, state);
                if (error) {
                    throw new BlockActionError(error, ref.blockType, ref.uuid);
                }

                return state;
            }
        );
    }

    /**
     * Generate id
     * @param idType
     * @param user
     * @param userCred
     */
    async generateId(
        idType: string,
        user: PolicyUser,
        userCred: UserCredentials
    ): Promise<string | undefined> {
        const ref = PolicyComponentsUtils.GetBlockRef(this);
        try {
            if (idType === 'UUID') {
                return await ref.components.generateUUID();
            }
            if (idType === 'DID') {
                const topic = await PolicyUtils.getOrCreateTopic(
                    ref,
                    'root',
                    null,
                    null
                );
                const didObject = await ref.components.generateDID(
                    topic.topicId
                );

                const message = new DIDMessage(MessageAction.CreateDID);
                message.setDocument(didObject);

                const userHederaCred = await userCred.loadHederaCredentials(
                    ref
                );
                const signOptions = await userCred.loadSignOptions(ref);
                const client = new MessageServer(
                    userHederaCred.hederaAccountId,
                    userHederaCred.hederaAccountKey,
                    signOptions,
                    ref.dryRun
                );
                const messageResult = await client
                    .setTopicObject(topic)
                    .sendMessage(message);

                const item = PolicyUtils.createDID(ref, user, didObject);
                item.messageId = messageResult.getId();
                item.topicId = messageResult.getTopicId();

                await userCred.saveSubDidDocument(ref, item, didObject);

                return didObject.getDid();
            }
            if (idType === 'OWNER') {
                return user.did;
            }
            return undefined;
        } catch (error) {
            ref.error(
                `generateId: ${idType} : ${PolicyUtils.getErrorMessage(error)}`
            );
            throw new BlockActionError(error, ref.blockType, ref.uuid);
        }
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
}
