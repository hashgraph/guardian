import { DocumentSignature, Schema, SchemaHelper } from 'interfaces';
import { ActionCallback, CalculateBlock } from '@policy-engine/helpers/decorators';
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
import { VcDocument as VcDocumentCollection } from '@entity/vc-document';
import { Inject } from '@helpers/decorators/inject';
import { Users } from '@helpers/users';
import { IPolicyEvent, PolicyInputEventType, PolicyOutputEventType } from '@policy-engine/interfaces';
import { ChildrenType, ControlType } from '@policy-engine/interfaces/block-about';

@CalculateBlock({
    blockType: 'calculateContainerBlock',
    commonBlock: true,
    about: {
        label: 'Calculate',
        title: `Add 'Calculate' Block`,
        post: false,
        get: false,
        children: ChildrenType.Special,
        control: ControlType.Server,
        input: [
            PolicyInputEventType.RunEvent
        ],
        output: [
            PolicyOutputEventType.RunEvent,
            PolicyOutputEventType.RefreshEvent
        ]
    }
})
export class CalculateContainerBlock {
    @Inject()
    private users: Users;

    private async calculate(documents: any | any[], ref: IPolicyCalculateBlock): Promise<VcDocumentCollection> {
        const fields = ref.options.inputFields;
        let scope = {};
        if (fields) {
            if (Array.isArray(documents)) {
                for (let field of fields) {
                    const value = [];
                    for (let json of documents) {
                        value.push(json[field.name]);
                    }
                    scope[field.value] = value;
                }
            } else {
                for (let field of fields) {
                    scope[field.value] = documents[field.name];
                }
            }
        }
        const addons = ref.getAddons();
        for (let i = 0; i < addons.length; i++) {
            const addon = addons[i];
            scope = await addon.run(scope);
        }
        let newJson: any = {};
        if (ref.options.outputFields) {
            for (let field of ref.options.outputFields) {
                if (scope[field.value]) {
                    newJson[field.name] = scope[field.value];
                }
            }
        }
        return newJson;
    }

    private async process(documents: any | any[], ref: IPolicyCalculateBlock): Promise<any> {
        const isArray = Array.isArray(documents);
        if (!documents || (isArray && !documents.length)) {
            throw new BlockActionError('Invalid VC', ref.blockType, ref.uuid);
        }

        // <-- aggregate
        const relationships = [];
        const owner = isArray ? documents[0].owner : documents.owner;
        let vcs: VcDocument | VcDocument[];
        let json: any | any[];
        if (isArray) {
            vcs = [];
            json = [];
            for (let doc of documents) {
                const vc = VcDocument.fromJsonTree(doc.document);
                vcs.push(vc);
                json.push(vc.getCredentialSubject(0).toJsonTree());
                if (doc.messageId) {
                    relationships.push(doc.messageId);
                }
            }
        } else {
            vcs = VcDocument.fromJsonTree(documents.document);
            json = vcs.getCredentialSubject(0).toJsonTree();
            if (documents.messageId) {
                relationships.push(documents.messageId);
            }
        }
        const vcId = isArray ? json[0].id : json.id;
        const vcReference = isArray ? json[0].ref : json.ref;
        // -->

        const newJson = await this.calculate(json, ref);

        // <-- new vc
        const outputSchema = await getMongoRepository(SchemaCollection).findOne({ iri: ref.options.outputSchema });
        const vcSubject: any = {
            ...SchemaHelper.getContext(outputSchema),
            ...newJson
        }
        vcSubject.policyId = ref.policyId;
        vcSubject.id = vcId;
        if (vcReference) {
            vcSubject.ref = vcReference;
        }

        const root = await this.users.getHederaAccount(ref.policyOwner);
        const VCHelper = new VcHelper();
        const newVC = await VCHelper.createVC(root.did, root.hederaAccountKey, vcSubject);
        const item = {
            hash: newVC.toCredentialHash(),
            document: newVC.toJsonTree(),
            owner: owner,
            schema: outputSchema.iri,
            type: outputSchema.iri,
            policyId: ref.policyId,
            tag: ref.tag,
            messageId: null,
            topicId: null,
            relationships: relationships.length ? relationships : null
        };
        // -->

        return item;
    }

    /**
     * @event PolicyEventType.Run
     * @param {IPolicyEvent} event
     */
    @ActionCallback({
        output: [PolicyOutputEventType.RunEvent, PolicyOutputEventType.RefreshEvent]
    })
    @CatchErrors()
    public async runAction(event: IPolicyEvent<any>) {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyCalculateBlock>(this);

        if (ref.options.inputDocuments == 'separate') {
            if (Array.isArray(event.data.data)) {
                const result = [];
                for (let doc of event.data.data) {
                    const newVC = await this.process(doc, ref);
                    result.push(newVC)
                }
                event.data.data = result;
            } else {
                event.data.data = await this.process(event.data.data, ref);
            }
        } else {
            event.data.data = await this.process(event.data.data, ref);
        }

        ref.triggerEvents(PolicyOutputEventType.RunEvent, event.user, event.data);
        ref.triggerEvents(PolicyOutputEventType.RefreshEvent, event.user, null);
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
