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
    IPolicyGetData,
    IPolicyRequestBlock,
    IPolicySourceBlock,
    IPolicyValidatorBlock,
} from '../policy-engine.interface.js';
import { ChildrenType, ControlType } from '../interfaces/block-about.js';
import { PolicyUser } from '../policy-user.js';
import { VcHelper, VcDocument as VcDocumentCollection } from '@guardian/common';
import {
    Schema,
    SchemaHelper,
    CheckResult,
    removeObjectProperties,
    LocationType,
} from '@guardian/interfaces';
import { BlockActionError } from '../errors/block-action-error.js';
import { PolicyUtils } from '../helpers/utils.js';
import { PolicyOutputEventType } from '../interfaces/policy-event-type.js';
import deepEqual from 'deep-equal';
import { PolicyActionsUtils } from '../policy-actions/utils.js';
import { hydrateTablesInObject, loadFileTextById } from '../helpers/table-field.js';

/**
 * Request VC document block addon with UI
 */
@EventBlock({
    blockType: 'requestVcDocumentBlockAddon',
    commonBlock: false,
    actionType: LocationType.REMOTE,
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
    async getData(user: PolicyUser): Promise<IPolicyGetData> {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyAddonBlock>(this);
        const data: IPolicyGetData = {
            id: ref.uuid,
            blockType: ref.blockType,
            actionType: ref.actionType,
            readonly: (
                ref.actionType === LocationType.REMOTE &&
                user.location === LocationType.REMOTE
            ),
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
            _data.ref,
            async (documentRef: any) => {
                if (!user.did) {
                    throw new BlockActionError(
                        'User have no any did.',
                        ref.blockType,
                        ref.uuid
                    );
                }
                const document = _data.document;

                const disposeTables = await hydrateTablesInObject(
                    document,
                    async (fileId: string) => loadFileTextById(ref, fileId),
                );

                PolicyUtils.setAutoCalculateFields(this._schema, document);

                disposeTables();

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

                //Relayer Account
                const relayerAccount = await PolicyUtils.getRelayerAccount(ref, user.did, _data.relayerAccount, documentRef, user.userId);

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
                let item = PolicyUtils.createVC(ref, user, vc);

                const tags = await PolicyUtils.getBlockTags(ref);
                PolicyUtils.setDocumentTags(item, tags);

                const accounts = PolicyUtils.getHederaAccounts(vc, relayerAccount, this._schema);
                const schemaIRI = ref.options.schema;
                item.type = schemaIRI;
                item.schema = schemaIRI;
                item.accounts = accounts;
                item.relayerAccount = relayerAccount;
                item = PolicyUtils.setDocumentRef(item, documentRef);

                const state: IPolicyEventState = { data: item };
                const error = await this.validateDocuments(user, state);
                if (error) {
                    throw new BlockActionError(error, ref.blockType, ref.uuid);
                }

                return state;
            }
        );

        ref.backup();
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
