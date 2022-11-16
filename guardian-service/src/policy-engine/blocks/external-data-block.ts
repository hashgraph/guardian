import { ActionCallback, ExternalData } from '@policy-engine/helpers/decorators';
import { DocumentSignature, Schema } from '@guardian/interfaces';
import { PolicyValidationResultsContainer } from '@policy-engine/policy-validation-results-container';
import { PolicyComponentsUtils } from '@policy-engine/policy-components-utils';
import { VcDocument } from '@hedera-modules';
import { VcHelper } from '@helpers/vc-helper';
import { CatchErrors } from '@policy-engine/helpers/decorators/catch-errors';
import { PolicyOutputEventType } from '@policy-engine/interfaces';
import { ChildrenType, ControlType } from '@policy-engine/interfaces/block-about';
import { AnyBlockType, IPolicyDocument, IPolicyValidatorBlock } from '@policy-engine/policy-engine.interface';
import { BlockActionError } from '@policy-engine/errors';
import { IPolicyUser, PolicyUser } from '@policy-engine/policy-user';
import { PolicyUtils } from '@policy-engine/helpers/utils';
import { VcDocument as VcDocumentCollection } from '@entity/vc-document';
import { ExternalDocuments, ExternalEvent, ExternalEventType } from '@policy-engine/interfaces/external-event';

/**
 * External data block
 */
@ExternalData({
    blockType: 'externalDataBlock',
    commonBlock: false,
    about: {
        label: 'External Data',
        title: `Add 'External Data' Block`,
        post: true,
        get: false,
        children: ChildrenType.None,
        control: ControlType.Server,
        input: null,
        output: [
            PolicyOutputEventType.RunEvent,
            PolicyOutputEventType.RefreshEvent,
            PolicyOutputEventType.ErrorEvent
        ],
        defaultEvent: true
    }
})
export class ExternalDataBlock {

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
            const schema = await ref.databaseServer.getSchemaByIRI(ref.options.schema, ref.topicId);
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
            ref.error(`Verify VC: ${PolicyUtils.getErrorMessage(error)}`)
            verify = false;
        }

        let user: PolicyUser = null;
        if (data.owner) {
            user = new PolicyUser(data.owner, !!ref.dryRun);
            if (data.group) {
                const group = await ref.databaseServer.getUserInGroup(ref.policyId, data.owner, data.group);
                user.setGroup(group);
            } else {
                const groups = await ref.databaseServer.getGroupsByUser(ref.policyId, data.owner);
                for (const group of groups) {
                    if (group.active !== false) {
                        user.setGroup(group);
                    }
                }
            }
        }

        const docOwner = await PolicyUtils.getHederaAccount(ref, data.owner);
        const documentRef = await this.getRelationships(ref, data.ref);
        const schema = await this.getSchema();
        const vc = VcDocument.fromJsonTree(data.document);
        const accounts = PolicyUtils.getHederaAccounts(vc, docOwner.hederaAccountId, schema);

        let doc = PolicyUtils.createVC(ref, user, vc);
        doc.type = ref.options.entityType;
        doc.schema = ref.options.schema;
        doc.accounts = accounts;
        doc.signature = (verify ?
            DocumentSignature.VERIFIED :
            DocumentSignature.INVALID);
        doc = PolicyUtils.setDocumentRef(doc, documentRef);

        const state = { data: doc };

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
    }

    /**
     * Validate block options
     * @param resultsContainer
     */
    public async validate(resultsContainer: PolicyValidationResultsContainer): Promise<void> {
        const ref = PolicyComponentsUtils.GetBlockRef(this);
        try {
            if (ref.options.schema) {
                if (typeof ref.options.schema !== 'string') {
                    resultsContainer.addBlockError(ref.uuid, 'Option "schema" must be a string');
                    return;
                }

                const schema = await ref.databaseServer.getSchemaByIRI(ref.options.schema, ref.topicId);
                if (!schema) {
                    resultsContainer.addBlockError(ref.uuid, `Schema with id "${ref.options.schema}" does not exist`);
                    return;
                }
            }
        } catch (error) {
            resultsContainer.addBlockError(ref.uuid, `Unhandled exception ${PolicyUtils.getErrorMessage(error)}`);
        }
    }
}
