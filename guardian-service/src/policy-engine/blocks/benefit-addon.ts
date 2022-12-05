import { TokenAddon } from '@policy-engine/helpers/decorators';
import { PolicyValidationResultsContainer } from '@policy-engine/policy-validation-results-container';
import { PolicyComponentsUtils } from '@policy-engine/policy-components-utils';
import { AnyBlockType, IPolicyCalculateAddon } from '@policy-engine/policy-engine.interface';
import { ChildrenType, ControlType, PropertyType } from '@policy-engine/interfaces/block-about';
import { IHederaAccount, PolicyUtils } from '@policy-engine/helpers/utils';
import { IPolicyUser } from '@policy-engine/policy-user';
import { Schema, SchemaEntity, SchemaHelper } from '@guardian/interfaces';
import { VcDocument } from '@hedera-modules';
import { VcHelper } from '@helpers/vc-helper';
import { BlockActionError } from '@policy-engine/errors';
import { PropertyValidator } from '@policy-engine/helpers/property-validator';

/**
 * Calculate math addon
 */
@TokenAddon({
    blockType: 'benefitAddon',
    commonBlock: true,
    about: {
        label: 'Benefit',
        title: `Add 'Benefit'`,
        post: false,
        get: false,
        children: ChildrenType.None,
        control: ControlType.Special,
        input: null,
        output: null,
        defaultEvent: false,
        properties: [{
            name: 'benefitType',
            label: 'Benefit type',
            title: 'Benefit type',
            type: PropertyType.Select,
            items: [{
                label: 'Issuing benefit',
                value: 'issuing benefit'
            }, {
                label: 'Co-benefit',
                value: 'co-benefit'
            }],
            default: 'co-benefit',
            required: true
        }, {
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
            this.schema = await ref.databaseServer.getSchemaByType(ref.topicId, SchemaEntity.ACTIVITY_BENEFIT);
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
        const amount = PolicyUtils.aggregate(ref.options.amount, documents);
        const vcHelper = new VcHelper();
        const vcSubject: any = {
            ...SchemaHelper.getContext(policySchema),
            benefitType: ref.options.benefitType === 'issuing benefit' ? 'issuing benefit' : 'co-benefit',
            date: (new Date()).toISOString(),
            amount: amount.toString(),
        }
        if (ref.options.unit) {
            vcSubject.unit = ref.options.unit;
        }
        if (ref.options.label) {
            vcSubject.label = ref.options.label;
        }
        if (ref.options.description) {
            vcSubject.description = ref.options.description;
        }
        const vc = await vcHelper.createVC(root.did, root.hederaAccountKey, vcSubject);
        return vc;
    }

    /**
     * Validate block options
     * @param resultsContainer
     */
    public async validate(resultsContainer: PolicyValidationResultsContainer): Promise<void> {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyCalculateAddon>(this);
        try {
            resultsContainer.checkBlockError(ref.uuid,
                PropertyValidator.inputValidator('amount', ref.options.amount, 'string')
            );
            resultsContainer.checkBlockError(ref.uuid,
                PropertyValidator.selectValidator('benefitType', ref.options.benefitType, ['issuing benefit', 'co-benefit'])
            );
        } catch (error) {
            resultsContainer.addBlockError(ref.uuid, `Unhandled exception ${PolicyUtils.getErrorMessage(error)}`);
        }
    }
}
