import { ActionCallback, ExternalData } from '../helpers/decorators/index.js';
import { DocumentSignature, LocationType, Schema } from '@guardian/interfaces';
import { PolicyComponentsUtils } from '../policy-components-utils.js';
import { CatchErrors } from '../helpers/decorators/catch-errors.js';
import { PolicyOutputEventType } from '../interfaces/index.js';
import { ChildrenType, ControlType } from '../interfaces/block-about.js';
import { AnyBlockType, IPolicyDocument, IPolicyEventState, IPolicyValidatorBlock } from '../policy-engine.interface.js';
import { BlockActionError } from '../errors/index.js';
import { PolicyUser } from '../policy-user.js';
import { PolicyUtils } from '../helpers/utils.js';
import {
    VcDocument as VcDocumentCollection,
    VcDocumentDefinition as VcDocument,
    VcHelper,
} from '@guardian/common';
import { ExternalDocuments, ExternalEvent, ExternalEventType } from '../interfaces/external-event.js';

/**
 * External data block
 */
@ExternalData({
    blockType: 'externalDataBlock',
    commonBlock: false,
    actionType: LocationType.REMOTE,
    about: {
        label: 'External Data',
        title: `Add 'External Data' Block`,
        post: true,
        get: false,
        children: ChildrenType.Special,
        control: ControlType.Server,
        input: null,
        output: [
            PolicyOutputEventType.RunEvent,
            PolicyOutputEventType.RefreshEvent,
            PolicyOutputEventType.ErrorEvent
        ],
        defaultEvent: true
    },
    variables: [
        { path: 'options.schema', alias: 'schema', type: 'Schema' }
    ]
})
export class ExternalDataBlock {

    /**
     * Before init callback
     */
    public async beforeInit(): Promise<void> {
        const ref = PolicyComponentsUtils.GetBlockRef(this);
        const documentCacheFields =
            PolicyComponentsUtils.getDocumentCacheFields(ref.policyId);
        documentCacheFields.add('credentialSubject.0.id');
    }

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
    protected async validateDocuments(user: PolicyUser, state: any): Promise<string> {
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
     * Get Schema
     */
    private async getSchema(): Promise<Schema> {
        const ref = PolicyComponentsUtils.GetBlockRef<AnyBlockType>(this);
        if (!ref.options.schema) {
            return null;
        }
        if (!this.schema) {
            const schema = await PolicyUtils.loadSchemaByID(ref, ref.options.schema);
            this.schema = schema ? new Schema(schema) : null;
            if (!this.schema) {
                throw new BlockActionError('Waiting for schema', ref.blockType, ref.uuid);
            }
        }
        return this.schema;
    }

    /**
     * Receive external data callback
     * @param data
     */
    @ActionCallback({
        output: [
            PolicyOutputEventType.RunEvent,
            PolicyOutputEventType.RefreshEvent,
            PolicyOutputEventType.ErrorEvent
        ]
    })
    @CatchErrors()
    async receiveData(data: IPolicyDocument) {
        const ref = PolicyComponentsUtils.GetBlockRef<AnyBlockType>(this);
        let verify: boolean;
        try {
            const VCHelper = new VcHelper();
            const res = await VCHelper.verifySchema(data.document);
            verify = res.ok;
            if (verify) {
                verify = await VCHelper.verifyVC(data.document);
            }
        } catch (error) {
            ref.error(`Verify VC: ${PolicyUtils.getErrorMessage(error)}`);
            verify = false;
        }

        const user: PolicyUser = await PolicyUtils.getDocumentOwner(ref, data, null);
        const documentRef = await this.getRelationships(ref, data.ref);
        const schema = await this.getSchema();
        const vc = VcDocument.fromJsonTree(data.document);

        //Relayer Account
        const relayerAccount = await PolicyUtils.getRelayerAccount(ref, user.did, data.relayerAccount, documentRef, user.userId);

        const accounts = PolicyUtils.getHederaAccounts(vc, relayerAccount, schema);

        let doc = PolicyUtils.createVC(ref, user, vc);
        doc.type = ref.options.entityType;
        doc.schema = ref.options.schema;
        doc.accounts = accounts;
        doc.relayerAccount = relayerAccount;
        doc.signature = (verify ?
            DocumentSignature.VERIFIED :
            DocumentSignature.INVALID);
        doc = PolicyUtils.setDocumentRef(doc, documentRef);

        const state: IPolicyEventState = { data: doc };

        const error = await this.validateDocuments(user, state);
        if (error) {
            throw new BlockActionError(error, ref.blockType, ref.uuid);
        }

        ref.triggerEvents(PolicyOutputEventType.RunEvent, user, state);
        ref.triggerEvents(PolicyOutputEventType.ReleaseEvent, user, null);
        ref.triggerEvents(PolicyOutputEventType.RefreshEvent, user, state);
        PolicyComponentsUtils.ExternalEventFn(new ExternalEvent(ExternalEventType.Run, ref, user, {
            documents: ExternalDocuments(doc)
        }));
        ref.backup();
    }
}
