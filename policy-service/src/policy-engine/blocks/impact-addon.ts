import { TokenAddon } from '../helpers/decorators/index.js';
import { PolicyComponentsUtils } from '../policy-components-utils.js';
import { AnyBlockType } from '../policy-engine.interface.js';
import { ChildrenType, ControlType, PropertyType } from '../interfaces/block-about.js';
import { PolicyUtils } from '../helpers/utils.js';
import { PolicyUser, UserCredentials } from '../policy-user.js';
import { LocationType, Schema, SchemaEntity, SchemaHelper } from '@guardian/interfaces';
import { VcDocumentDefinition as VcDocument, VcHelper } from '@guardian/common';
import { BlockActionError } from '../errors/index.js';

/**
 * Calculate math addon
 */
@TokenAddon({
    blockType: 'impactAddon',
    commonBlock: true,
    actionType: LocationType.REMOTE,
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
            editable: true,
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
            editable: true,
            type: PropertyType.Input
        }, {
            name: 'description',
            label: 'Description',
            title: 'Description',
            editable: true,
            type: PropertyType.Input
        }, {
            name: 'amount',
            label: 'Amount (Formula)',
            title: 'Amount (Formula)',
            required: true,
            editable: true,
            type: PropertyType.Input
        }, {
            name: 'unit',
            label: 'Unit',
            title: 'Unit',
            editable: true,
            type: PropertyType.Input
        }]
    },
    variables: []
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
            this.schema = await PolicyUtils.loadSchemaByType(ref, SchemaEntity.ACTIVITY_IMPACT);
            if (!this.schema) {
                throw new BlockActionError('Waiting for schema', ref.blockType, ref.uuid);
            }
        }
        return this.schema;
    }

    /**
     * Run logic
     * @param documents
     * @param root
     * @param user
     * @param userId
     */
    public async run(
        documents: VcDocument[],
        root: UserCredentials,
        user: PolicyUser,
        userId: string | null
    ): Promise<any> {
        const ref = PolicyComponentsUtils.GetBlockRef<AnyBlockType>(this);
        const options = await ref.getOptions(user);
        const policySchema = await this.getSchema();
        const amount = PolicyUtils.aggregate(options.amount, documents);
        const vcHelper = new VcHelper();
        const vcSubject: any = {
            ...SchemaHelper.getContext(policySchema),
            impactType: options.impactType === 'Primary Impacts' ? 'Primary Impacts' : 'Secondary Impacts',
            date: (new Date()).toISOString(),
            amount: amount.toString(),
        }
        if (options.unit) {
            vcSubject.unit = options.unit;
        }
        if (options.label) {
            vcSubject.label = options.label;
        }
        if (options.description) {
            vcSubject.description = options.description;
        }
        const didDocument = await root.loadDidDocument(ref, userId);
        const uuid = await ref.components.generateUUID();
        const vc = await vcHelper.createVerifiableCredential(
            vcSubject,
            didDocument,
            null,
            { uuid }
        );
        return vc;
    }
}
