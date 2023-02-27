import { TokenAddon } from '@policy-engine/helpers/decorators';
import { PolicyComponentsUtils } from '@policy-engine/policy-components-utils';
import { AnyBlockType, IPolicyCalculateAddon } from '@policy-engine/policy-engine.interface';
import { ChildrenType, ControlType, PropertyType } from '@policy-engine/interfaces/block-about';
import { IHederaAccount, PolicyUtils } from '@policy-engine/helpers/utils';
import { IPolicyUser } from '@policy-engine/policy-user';
import { Schema, SchemaEntity, SchemaHelper } from '@guardian/interfaces';
import { VcDocument } from '@hedera-modules';
import { VcHelper } from '@helpers/vc-helper';
import { BlockActionError } from '@policy-engine/errors';

/**
 * Calculate math addon
 */
@TokenAddon({
    blockType: 'impactAddon',
    commonBlock: true,
    about: {
        label: 'Impact',
        title: `Add 'Impact'`,
        post: false,
        get: false,
        children: ChildrenType.None,
        control: ControlType.Special,
        input: null,
        output: null,
        defaultEvent: false,
        properties: [{
            name: 'impactType',
            label: 'Impact type',
            title: 'Impact type',
            type: PropertyType.Select,
            items: [{
                label: 'Primary Impacts',
                value: 'Primary Impacts'
            }, {
                label: 'Secondary Impacts',
                value: 'Secondary Impacts'
            }],
            default: 'Secondary Impacts',
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
            this.schema = await ref.databaseServer.getSchemaByType(ref.topicId, SchemaEntity.ACTIVITY_IMPACT);
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
            impactType: ref.options.impactType === 'Primary Impacts' ? 'Primary Impacts' : 'Secondary Impacts',
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
}
