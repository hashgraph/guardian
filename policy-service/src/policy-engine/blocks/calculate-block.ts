import { SchemaHelper } from '@guardian/interfaces';
import { ActionCallback, CalculateBlock } from '@policy-engine/helpers/decorators';
import { PolicyComponentsUtils } from '@policy-engine/policy-components-utils';
import { IPolicyCalculateBlock, IPolicyDocument, IPolicyEventState } from '@policy-engine/policy-engine.interface';
import { BlockActionError } from '@policy-engine/errors';
import { CatchErrors } from '@policy-engine/helpers/decorators/catch-errors';
import { VcDocumentDefinition, VcHelper } from '@guardian/common';
// tslint:disable-next-line:no-duplicate-imports
import { VcDocument as VcDocumentCollection } from '@guardian/common';
import { IPolicyEvent, PolicyInputEventType, PolicyOutputEventType } from '@policy-engine/interfaces';
import { ChildrenType, ControlType, PropertyType } from '@policy-engine/interfaces/block-about';
import { PolicyUtils } from '@policy-engine/helpers/utils';
import { IPolicyUser } from '@policy-engine/policy-user';
import { ExternalDocuments, ExternalEvent, ExternalEventType } from '@policy-engine/interfaces/external-event';

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
            PolicyOutputEventType.RefreshEvent,
            PolicyOutputEventType.ErrorEvent
        ],
        defaultEvent: true,
        properties: [{
            name: 'unsigned',
            label: 'Unsigned VC',
            title: 'Unsigned document',
            type: PropertyType.Checkbox
        }]
    },
    variables: [
        { path: 'options.outputSchema', alias: 'schema', type: 'Schema' }
    ]
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
        let docOwner: IPolicyUser;
        if (fields) {
            if (Array.isArray(documents)) {
                for (const field of fields) {
                    const value = [];
                    for (const json of documents) {
                        value.push(json[field.name]);
                    }
                    scope[field.value] = value;
                }
                docOwner = PolicyUtils.getDocumentOwner(ref, documents[0]);
            } else {
                for (const field of fields) {
                    scope[field.value] = documents[field.name];
                }
                docOwner = PolicyUtils.getDocumentOwner(ref, documents);
            }
        }
        const addons = ref.getAddons();
        for (const addon of addons) {
            scope = await addon.run(scope, docOwner);
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
    private async process(
        documents: IPolicyDocument | IPolicyDocument[],
        ref: IPolicyCalculateBlock
    ): Promise<IPolicyDocument> {
        const isArray = Array.isArray(documents);
        if (!documents || (isArray && !documents.length)) {
            throw new BlockActionError('Invalid VC', ref.blockType, ref.uuid);
        }

        // <-- aggregate
        let json: any | any[];
        if (isArray) {
            json = [];
            for (const doc of documents) {
                const vc = VcDocumentDefinition.fromJsonTree(doc.document);
                json.push(vc.getCredentialSubject(0).toJsonTree());

            }
        } else {
            const vc = VcDocumentDefinition.fromJsonTree(documents.document);
            json = vc.getCredentialSubject(0).toJsonTree();
        }
        // -->

        const newJson = await this.calculate(json, ref);
        if (ref.options.unsigned) {
            return await this.createUnsignedDocument(newJson, ref);
        } else {
            const metadata = this.aggregateMetadata(documents, ref);
            return await this.createDocument(newJson, metadata, ref);
        }
    }

    /**
     * Generate document metadata
     * @param documents
     * @param ref
     */
    private aggregateMetadata(
        documents: IPolicyDocument | IPolicyDocument[],
        ref: IPolicyCalculateBlock
    ) {
        const isArray = Array.isArray(documents);
        const firstDocument = isArray ? documents[0] : documents;
        const owner = PolicyUtils.getDocumentOwner(ref, firstDocument);
        const relationships = [];
        let accounts: any = {};
        let tokens: any = {};
        let id: string;
        let reference: string;
        if (isArray) {
            const credentialSubject = documents[0].document?.credentialSubject;
            if (credentialSubject) {
                if (Array.isArray(credentialSubject)) {
                    id = credentialSubject[0].id;
                    reference = credentialSubject[0].ref;
                } else if (credentialSubject) {
                    id = credentialSubject.id;
                    reference = credentialSubject.ref;
                }
            }
            for (const doc of documents) {
                accounts = Object.assign(accounts, doc.accounts);
                tokens = Object.assign(tokens, doc.tokens);
                if (doc.messageId) {
                    relationships.push(doc.messageId);
                }
            }
        } else {
            const credentialSubject = documents.document?.credentialSubject;
            if (credentialSubject) {
                if (Array.isArray(credentialSubject)) {
                    id = credentialSubject[0].id;
                    reference = credentialSubject[0].ref;
                } else if (credentialSubject) {
                    id = credentialSubject.id;
                    reference = credentialSubject.ref;
                }
            }
            accounts = Object.assign(accounts, documents.accounts);
            tokens = Object.assign(tokens, documents.tokens);
            if (documents.messageId) {
                relationships.push(documents.messageId);
            }
        }
        return { owner, id, reference, accounts, tokens, relationships };
    }

    /**
     * Generate signed document
     * @param json
     * @param metadata
     * @param ref
     */
    private async createDocument(
        json: any,
        metadata: any,
        ref: IPolicyCalculateBlock
    ): Promise<IPolicyDocument> {
        const {
            owner,
            id,
            reference,
            accounts,
            tokens,
            relationships
        } = metadata;
        // <-- new vc
        const VCHelper = new VcHelper();

        const outputSchema = await PolicyUtils.loadSchemaByID(ref, ref.options.outputSchema);
        const vcSubject: any = {
            ...SchemaHelper.getContext(outputSchema),
            ...json
        }
        vcSubject.policyId = ref.policyId;
        vcSubject.id = id;
        if (reference) {
            vcSubject.ref = reference;
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
        item.accounts = accounts && Object.keys(accounts).length ? accounts : null;
        item.tokens = tokens && Object.keys(tokens).length ? tokens : null;
        // -->

        return item;
    }

    /**
     * Generate unsigned document
     * @param json
     * @param ref
     */
    private async createUnsignedDocument(
        json: any,
        ref: IPolicyCalculateBlock
    ): Promise<IPolicyDocument> {
        const vc = PolicyUtils.createVcFromSubject(json);
        return PolicyUtils.createUnsignedVC(ref, vc);
    }

    /**
     * Run action callback
     * @event PolicyEventType.Run
     * @param {IPolicyEvent} event
     */
    @ActionCallback({
        output: [
            PolicyOutputEventType.RunEvent,
            PolicyOutputEventType.RefreshEvent,
            PolicyOutputEventType.ErrorEvent
        ]
    })
    @CatchErrors()
    public async runAction(event: IPolicyEvent<IPolicyEventState>) {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyCalculateBlock>(this);

        if (ref.options.inputDocuments === 'separate') {
            if (Array.isArray(event.data.data)) {
                const result: IPolicyDocument[] = [];
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
        ref.triggerEvents(PolicyOutputEventType.ReleaseEvent, event.user, null);
        ref.triggerEvents(PolicyOutputEventType.RefreshEvent, event.user, event.data);
        PolicyComponentsUtils.ExternalEventFn(new ExternalEvent(ExternalEventType.Run, ref, event.user, {
            documents: ExternalDocuments(event.data?.data)
        }));
    }
}
