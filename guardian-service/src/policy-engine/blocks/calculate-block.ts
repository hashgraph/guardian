import { DocumentSignature, Schema, SchemaHelper } from 'interfaces';
import { CalculateBlock } from '@policy-engine/helpers/decorators';
import { PolicyValidationResultsContainer } from '@policy-engine/policy-validation-results-container';
import { PolicyComponentsUtils } from '../policy-components-utils';
import { IPolicyCalculateBlock } from '@policy-engine/policy-engine.interface';
import { BlockActionError } from '@policy-engine/errors';
import { IAuthUser } from '@auth/auth.interface';
import { CatchErrors } from '@policy-engine/helpers/decorators/catch-errors';
import { VcDocument } from '@hedera-modules';
import { VcHelper } from '@helpers/vcHelper';
import { getMongoRepository } from 'typeorm';
import { Schema as SchemaCollection } from '@entity/schema';
import { Inject } from '@helpers/decorators/inject';
import { Users } from '@helpers/users';

@CalculateBlock({
    blockType: 'calculateContainerBlock',
    commonBlock: true
})
export class CalculateContainerBlock {
    @Inject()
    private users: Users;

    async calculate(document: any) {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyCalculateBlock>(this);
        if (document.signature === DocumentSignature.INVALID) {
            throw new BlockActionError('Invalid VC proof', ref.blockType, ref.uuid);
        }

        const VC = VcDocument.fromJsonTree(document.document);
        const json = VC.getCredentialSubject()[0].toJsonTree();

        let scope = {};
        if (ref.options.inputFields) {
            for (let i = 0; i < ref.options.inputFields.length; i++) {
                const field = ref.options.inputFields[i];
                scope[field.value] = json[field.name];
            }
        }

        const addons = ref.getAddons();
        for (let i = 0; i < addons.length; i++) {
            const addon = addons[i];
            scope = await addon.run(scope);
        }

        let newJson: any = {};
        if (ref.options.outputFields) {
            for (let i = 0; i < ref.options.outputFields.length; i++) {
                const field = ref.options.outputFields[i];
                if(scope[field.value]) {
                    newJson[field.name] = scope[field.value];
                }
            }
        }
        newJson.id = json.id;

        const outputSchema = await getMongoRepository(SchemaCollection).findOne({
            iri: ref.options.outputSchema
        });
        const vcSubject = {
            ...SchemaHelper.getContext(outputSchema),
            ...newJson
        }

        if (json.ref) {
            vcSubject.ref = json.ref;
        }
        if (json.policyId) {
            vcSubject.policyId = json.policyId;
        }

        const root = await this.users.getHederaAccount(ref.policyOwner);

        const VCHelper = new VcHelper();
        const newVC = await VCHelper.createVC(
            root.did,
            root.hederaAccountKey,
            vcSubject
        );
        const item = {
            hash: newVC.toCredentialHash(),
            owner: document.owner,
            document: newVC.toJsonTree(),
            schema: outputSchema.iri,
            type: outputSchema.iri,
            policyId: ref.policyId,
            tag: ref.tag
        };
        return item;
    }

    @CatchErrors()
    public async runAction(state: any, user: IAuthUser) {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyCalculateBlock>(this);
        let document = null;
        if (Array.isArray(state.data)) {
            document = state.data[0];
        } else {
            document = state.data;
        }
        const newDocument = await this.calculate(document);
        state.data = newDocument;
        await ref.runNext(user, state);
        PolicyComponentsUtils.CallDependencyCallbacks(ref.tag, ref.policyId, user);
        PolicyComponentsUtils.CallParentContainerCallback(ref, user);
        // ref.updateBlock(state, user, '');
    }

    public async validate(resultsContainer: PolicyValidationResultsContainer): Promise<void> {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyCalculateBlock>(this);
        try {
            // Test schema options
            if (!ref.options.inputSchema) {
                resultsContainer.addBlockError(ref.uuid, 'Option "inputSchema" does not set');
                return;
            }
            if (typeof ref.options.inputSchema !== 'string') {
                resultsContainer.addBlockError(ref.uuid, 'Option "inputSchema" must be a string');
                return;
            }
            const inputSchema = await getMongoRepository(SchemaCollection).findOne({
                iri: ref.options.inputSchema
            });
            if (!inputSchema) {
                resultsContainer.addBlockError(ref.uuid, `Schema with id "${ref.options.inputSchema}" does not exist`);
                return;
            }

            // Test schema options
            if (!ref.options.outputSchema) {
                resultsContainer.addBlockError(ref.uuid, 'Option "outputSchema" does not set');
                return;
            }
            if (typeof ref.options.outputSchema !== 'string') {
                resultsContainer.addBlockError(ref.uuid, 'Option "outputSchema" must be a string');
                return;
            }
            const outputSchema = await getMongoRepository(SchemaCollection).findOne({
                iri: ref.options.outputSchema
            })
            if (!outputSchema) {
                resultsContainer.addBlockError(ref.uuid, `Schema with id "${ref.options.outputSchema}" does not exist`);
                return;
            }

            let variables: any = {};
            if (ref.options.inputFields) {
                for (let i = 0; i < ref.options.inputFields.length; i++) {
                    const field = ref.options.inputFields[i];
                    variables[field.value] = field.name;
                }
            }

            const addons = ref.getAddons();
            for (let i = 0; i < addons.length; i++) {
                const addon = addons[i];
                variables = await addon.getVariables(variables);
            }

            const map = {};
            if (ref.options.outputFields) {
                for (let i = 0; i < ref.options.outputFields.length; i++) {
                    const field = ref.options.outputFields[i];
                    if (!field.value) {
                        continue;
                    }
                    if (!variables.hasOwnProperty(field.value)) {
                        resultsContainer.addBlockError(ref.uuid, `Variable ${field.value} not defined`);
                        return;
                    }
                    map[field.name] = true;
                }
            }

            const schema = new Schema(outputSchema);
            for (let i = 0; i < schema.fields.length; i++) {
                const field = schema.fields[i];
                if (field.required && !map[field.name]) {
                    resultsContainer.addBlockError(ref.uuid, `${field.description} is required`);
                    return
                }
            }
        } catch (error) {
            resultsContainer.addBlockError(ref.uuid, `Unhandled exception ${error.message}`);
        }
    }
}
