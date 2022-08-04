import { ActionCallback, ExternalData } from '@policy-engine/helpers/decorators';
import { DocumentSignature, DocumentStatus, Schema } from '@guardian/interfaces';
import { PolicyValidationResultsContainer } from '@policy-engine/policy-validation-results-container';
import { PolicyComponentsUtils } from '@policy-engine/policy-components-utils';
import { VcDocument } from '@hedera-modules';
import { VcHelper } from '@helpers/vc-helper';
import { getMongoRepository } from 'typeorm';
import { Schema as SchemaCollection } from '@entity/schema';
import { CatchErrors } from '@policy-engine/helpers/decorators/catch-errors';
import { PolicyOutputEventType } from '@policy-engine/interfaces';
import { ChildrenType, ControlType } from '@policy-engine/interfaces/block-about';
import { AnyBlockType, IPolicyValidatorBlock } from '@policy-engine/policy-engine.interface';
import { IAuthUser } from '@guardian/common';
import { BlockActionError } from '@policy-engine/errors';
import { PolicyUtils } from '@policy-engine/helpers/utils';
import { Inject } from '@helpers/decorators/inject';
import { Users } from '@helpers/users';

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
            PolicyOutputEventType.RefreshEvent
        ],
        defaultEvent: true
    }
})
export class ExternalDataBlock {
    /**
     * Users helper
     * @private
     */
    @Inject()
    private readonly users: Users;

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
    protected async validateDocuments(user: IAuthUser, state: any): Promise<boolean> {
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
     * Get Schema
     */
    async getSchema(): Promise<Schema> {
        const ref = PolicyComponentsUtils.GetBlockRef<AnyBlockType>(this);
        if (!ref.options.schema) {
            return null;
        }
        if (!this.schema) {
            const schema = await getMongoRepository(SchemaCollection).findOne({
                iri: ref.options.schema,
                topicId: ref.topicId
            });
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
        output: [PolicyOutputEventType.RunEvent, PolicyOutputEventType.RefreshEvent]
    })
    @CatchErrors()
    async receiveData(data: any) {
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
            ref.error(`Verify VC: ${error.message}`)
            verify = false;
        }
        const docOwner = await this.users.getUserById(data.owner);

        const schema = await this.getSchema();
        const vc = VcDocument.fromJsonTree(data.document);
        const accounts = PolicyUtils.getHederaAccounts(vc, docOwner.hederaAccountId, schema);

        const doc = PolicyUtils.createVCRecord(
            ref.policyId,
            ref.tag,
            ref.options.entityType,
            vc,
            {
                owner: data.owner,
                hederaStatus: DocumentStatus.NEW,
                signature: (verify ?
                    DocumentSignature.VERIFIED :
                    DocumentSignature.INVALID),
                schema: ref.options.schema,
                accounts
            }
        );

        const state = { data: doc };

        const valid = await this.validateDocuments(null, state);
        if (!valid) {
            throw new BlockActionError('Invalid document', ref.blockType, ref.uuid);
        }

        ref.triggerEvents(PolicyOutputEventType.RunEvent, null, state);
        ref.triggerEvents(PolicyOutputEventType.RefreshEvent, null, state);
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

                const schema = await getMongoRepository(SchemaCollection).findOne({
                    iri: ref.options.schema,
                    topicId: ref.topicId
                });
                if (!schema) {
                    resultsContainer.addBlockError(ref.uuid, `Schema with id "${ref.options.schema}" does not exist`);
                    return;
                }
            }
        } catch (error) {
            resultsContainer.addBlockError(ref.uuid, `Unhandled exception ${error.message}`);
        }
    }
}
