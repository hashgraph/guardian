import { Schema, SchemaHelper } from '@guardian/interfaces';
import { ActionCallback, CalculateBlock } from '@policy-engine/helpers/decorators';
import { PolicyValidationResultsContainer } from '@policy-engine/policy-validation-results-container';
import { PolicyComponentsUtils } from '@policy-engine/policy-components-utils';
import { IPolicyCalculateBlock, IPolicyDocument, IPolicyEventState, IPolicyState } from '@policy-engine/policy-engine.interface';
import { BlockActionError } from '@policy-engine/errors';
import { CatchErrors } from '@policy-engine/helpers/decorators/catch-errors';
import { VcDocument } from '@hedera-modules';
import { VcHelper } from '@helpers/vc-helper';
import { VcDocument as VcDocumentCollection } from '@entity/vc-document';
import { IPolicyEvent, PolicyInputEventType, PolicyOutputEventType } from '@policy-engine/interfaces';
import { ChildrenType, ControlType } from '@policy-engine/interfaces/block-about';
import { PolicyUtils } from '@policy-engine/helpers/utils';

/**
 * Calculate block
 */
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
        ],
        defaultEvent: true
    }
})
export class CalculateContainerBlock {
    /**
     * Calculate data
     * @param documents
     * @param ref
     * @private
     */
    private async calculate(documents: any | any[], ref: IPolicyCalculateBlock): Promise<VcDocumentCollection> {
        const fields = ref.options.inputFields;
        let scope = {};
        if (fields) {
            if (Array.isArray(documents)) {
                for (const field of fields) {
                    const value = [];
                    for (const json of documents) {
                        value.push(json[field.name]);
                    }
                    scope[field.value] = value;
                }
            } else {
                for (const field of fields) {
                    scope[field.value] = documents[field.name];
                }
            }
        }
        const addons = ref.getAddons();
        for (const addon of addons) {
            scope = await addon.run(scope);
        }
        const newJson: any = {};
        if (ref.options.outputFields) {
            for (const field of ref.options.outputFields) {
                if (scope[field.value]) {
                    newJson[field.name] = scope[field.value];
                }
            }
        }
        return newJson;
    }

    /**
     * Process data
     * @param documents
     * @param ref
     * @private
     */
    private async process(documents: IPolicyDocument | IPolicyDocument[], ref: IPolicyCalculateBlock): Promise<any> {
        const isArray = Array.isArray(documents);
        if (!documents || (isArray && !documents.length)) {
            throw new BlockActionError('Invalid VC', ref.blockType, ref.uuid);
        }

        // <-- aggregate
        const relationships = [];
        const owner = PolicyUtils.getDocumentOwner(ref, isArray ? documents[0] : documents);

        let vcs: VcDocument | VcDocument[];
        let json: any | any[];
        if (isArray) {
            vcs = [];
            json = [];
            for (const doc of documents) {
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
        const VCHelper = new VcHelper();

        const outputSchema = await ref.databaseServer.getSchemaByIRI(ref.options.outputSchema, ref.topicId);
        const vcSubject: any = {
            ...SchemaHelper.getContext(outputSchema),
            ...newJson
        }
        vcSubject.policyId = ref.policyId;
        vcSubject.id = vcId;
        if (vcReference) {
            vcSubject.ref = vcReference;
        }
        if (ref.dryRun) {
            VCHelper.addDryRunContext(vcSubject);
        }

        const root = await PolicyUtils.getHederaAccount(ref, ref.policyOwner);
        const newVC = await VCHelper.createVC(ref.policyOwner, root.hederaAccountKey, vcSubject);

        const item = PolicyUtils.createVC(ref, owner, newVC);
        item.type = outputSchema.iri;
        item.schema = outputSchema.iri;
        item.relationships = relationships.length ? relationships : null;
        // -->

        return item;
    }

    /**
     * Run action callback
     */
    /**
     * @event PolicyEventType.Run
     * @param {IPolicyEvent} event
     */
    @ActionCallback({
        output: [PolicyOutputEventType.RunEvent, PolicyOutputEventType.RefreshEvent]
    })
    @CatchErrors()
    public async runAction(event: IPolicyEvent<IPolicyEventState>) {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyCalculateBlock>(this);

        if (ref.options.inputDocuments === 'separate') {
            if (Array.isArray(event.data.data)) {
                const result = [];
                for (const doc of event.data.data) {
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
        ref.triggerEvents(PolicyOutputEventType.RefreshEvent, event.user, event.data);
    }

    /**
     * Validate block options
     * @param resultsContainer
     */
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
            const inputSchema = await ref.databaseServer.getSchemaByIRI(ref.options.inputSchema, ref.topicId);
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
            const outputSchema = await ref.databaseServer.getSchemaByIRI(ref.options.outputSchema, ref.topicId);
            if (!outputSchema) {
                resultsContainer.addBlockError(ref.uuid, `Schema with id "${ref.options.outputSchema}" does not exist`);
                return;
            }

            let variables: any = {};
            if (ref.options.inputFields) {
                for (const field of ref.options.inputFields) {
                    variables[field.value] = field.name;
                }
            }

            const addons = ref.getAddons();
            for (const addon of addons) {
                variables = await addon.getVariables(variables);
            }

            const map = {};
            if (ref.options.outputFields) {
                for (const field of ref.options.outputFields) {
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
            for (const field of schema.fields) {
                if (field.required && !map[field.name]) {
                    resultsContainer.addBlockError(ref.uuid, `${field.description} is required`);
                    return
                }
            }
        } catch (error) {
            resultsContainer.addBlockError(ref.uuid, `Unhandled exception ${PolicyUtils.getErrorMessage(error)}`);
        }
    }
}
