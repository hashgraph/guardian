import { TokenAddon } from '@policy-engine/helpers/decorators';
import { PolicyValidationResultsContainer } from '@policy-engine/policy-validation-results-container';
import { PolicyComponentsUtils } from '@policy-engine/policy-components-utils';
import { AnyBlockType, IPolicyCalculateAddon } from '@policy-engine/policy-engine.interface';
import { ChildrenType, ControlType, PropertyType } from '@policy-engine/interfaces/block-about';
import { IHederaAccount, PolicyUtils } from '@policy-engine/helpers/utils';
import { IPolicyUser } from '@policy-engine/policy-user';
import { DocumentSignature, GenerateUUIDv4, Schema, SchemaEntity, SchemaHelper } from '@guardian/interfaces';
import { VcDocument } from '@hedera-modules';
import { VcHelper } from '@helpers/vc-helper';
import { BlockActionError } from '@policy-engine/errors';

/**
 * Calculate math addon
 */
@TokenAddon({
    blockType: 'tokenAddon',
    commonBlock: true,
    about: {
        label: 'Token Addon',
        title: `Add 'Token' Addon`,
        post: false,
        get: false,
        children: ChildrenType.None,
        control: ControlType.Special,
        input: null,
        output: null,
        defaultEvent: false,
        properties: [{
            name: 'label',
            label: 'Label',
            title: 'Label',
            type: PropertyType.Input
        }, {
            name: 'description',
            label: 'Description',
            title: 'Description',
            type: PropertyType.Input
        }, {
            name: 'amount',
            label: 'Amount (Formula)',
            title: 'Amount (Formula)',
            required: true,
            type: PropertyType.Input
        }, {
            name: 'unit',
            label: 'Unit',
            title: 'Unit',
            type: PropertyType.Input
        }]
    }
})
export class TokenOperationAddon {
    /**
     * Schema
     * @private
     */
    private schema: any | null;

    /**
     * Get Schema
     */
    async getSchema(): Promise<Schema> {
        if (!this.schema) {
            const ref = PolicyComponentsUtils.GetBlockRef<AnyBlockType>(this);
            this.schema = await ref.databaseServer.getSchemaByType(ref.topicId, SchemaEntity.MINT_TOKEN);
            if (!this.schema) {
                throw new BlockActionError('Waiting for schema', ref.blockType, ref.uuid);
            }
        }
        return this.schema;
    }

    /**
     * Run logic
     * @param documents
     * @param user
     */
    public async run(documents: VcDocument[], root: IHederaAccount, user: IPolicyUser): Promise<any> {
        const ref = PolicyComponentsUtils.GetBlockRef<AnyBlockType>(this);
        const policySchema = await this.getSchema();
        const amount = PolicyUtils.aggregate(ref.options.rule, documents);
        const vcHelper = new VcHelper();
        const vcSubject = {
            ...SchemaHelper.getContext(policySchema),
            date: (new Date()).toISOString(),
            amount: amount.toString(),
            label: ref.options.label,
            description: ref.options.description,
            unit: ref.options.unit,
        }
        const mintVC = await vcHelper.createVC(root.did, root.hederaAccountKey, vcSubject);
        return mintVC;
    }

    /**
     * Validate block options
     * @param resultsContainer
     */
    public async validate(resultsContainer: PolicyValidationResultsContainer): Promise<void> {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyCalculateAddon>(this);
        try {
        } catch (error) {
            resultsContainer.addBlockError(ref.uuid, `Unhandled exception ${PolicyUtils.getErrorMessage(error)}`);
        }
    }
}
