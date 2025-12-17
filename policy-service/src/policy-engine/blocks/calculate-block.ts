import { IVC, LocationType, SchemaHelper } from '@guardian/interfaces';
import { ActionCallback, CalculateBlock } from '../helpers/decorators/index.js';
import { PolicyComponentsUtils } from '../policy-components-utils.js';
import { IPolicyCalculateBlock, IPolicyDocument, IPolicyEventState } from '../policy-engine.interface.js';
import { BlockActionError } from '../errors/index.js';
import { CatchErrors } from '../helpers/decorators/catch-errors.js';
import { VcDocumentDefinition, VcHelper } from '@guardian/common';
// tslint:disable-next-line:no-duplicate-imports
import { VcDocument as VcDocumentCollection } from '@guardian/common';
import { IPolicyEvent, PolicyInputEventType, PolicyOutputEventType } from '../interfaces/index.js';
import { ChildrenType, ControlType, PropertyType } from '../interfaces/block-about.js';
import { PolicyUtils } from '../helpers/utils.js';
import { PolicyUser } from '../policy-user.js';
import { ExternalDocuments, ExternalEvent, ExternalEventType } from '../interfaces/external-event.js';
import { RecordActionStep } from '../record-action-step.js';

interface IMetadata {
    owner: PolicyUser;
    relayerAccount: string;
    id: string;
    reference: string;
    accounts: any;
    tokens: any;
    relationships: any[];
}

/**
 * Calculate block
 */
@CalculateBlock({
    blockType: 'calculateContainerBlock',
    commonBlock: true,
    actionType: LocationType.REMOTE,
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
     * @param parents
     * @param userId
     * @private
     */
    private async calculate(
        documents: IVC | IVC[],
        ref: IPolicyCalculateBlock,
        parents: IPolicyDocument | IPolicyDocument[],
        userId: string | null
    ): Promise<VcDocumentCollection> {
        const fields = ref.options.inputFields;
        let scope = {};
        let docOwner: PolicyUser;
        if (Array.isArray(parents)) {
            docOwner = await PolicyUtils.getDocumentOwner(ref, parents[0], userId);
        } else {
            docOwner = await PolicyUtils.getDocumentOwner(ref, parents, userId);
        }
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
     * @param userId
     * @private
     */
    private async process(
        documents: IPolicyDocument | IPolicyDocument[],
        ref: IPolicyCalculateBlock,
        userId: string | null,
        actionStatus: RecordActionStep
    ): Promise<IPolicyDocument> {
        const context = await ref.debugContext({ documents });
        const contextDocuments = context.documents as IPolicyDocument | IPolicyDocument[];

        const isArray = Array.isArray(contextDocuments);
        if (!contextDocuments || (isArray && !contextDocuments.length)) {
            throw new BlockActionError('Invalid VC', ref.blockType, ref.uuid);
        }

        // <-- aggregate
        let json: any | any[];
        if (isArray) {
            json = [];
            for (const doc of contextDocuments) {
                const vc = VcDocumentDefinition.fromJsonTree(doc.document);
                json.push(vc.getCredentialSubject(0).toJsonTree());

            }
        } else {
            const vc = VcDocumentDefinition.fromJsonTree(contextDocuments.document);
            json = vc.getCredentialSubject(0).toJsonTree();
        }
        // -->

        const newJson = await this.calculate(json, ref, contextDocuments, userId);
        if (ref.options.unsigned) {
            return await this.createUnsignedDocument(newJson, ref, actionStatus?.id);
        } else {
            const metadata = await this.aggregateMetadata(contextDocuments, ref, userId);
            return await this.createDocument(newJson, metadata, ref, userId, actionStatus?.id);
        }
    }

    /**
     * Generate document metadata
     * @param documents
     * @param ref
     * @param userId
     */
    private async aggregateMetadata(
        documents: IPolicyDocument | IPolicyDocument[],
        ref: IPolicyCalculateBlock,
        userId: string | null
    ): Promise<IMetadata> {
        const isArray = Array.isArray(documents);
        const firstDocument = isArray ? documents[0] : documents;
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
        const owner = await PolicyUtils.getDocumentOwner(ref, firstDocument, userId);
        const relayerAccount = await PolicyUtils.getDocumentRelayerAccount(ref, firstDocument, userId);
        return { owner, relayerAccount, id, reference, accounts, tokens, relationships };
    }

    /**
     * Generate signed document
     * @param json
     * @param metadata
     * @param ref
     */
    private async createDocument(
        json: any,
        metadata: IMetadata,
        ref: IPolicyCalculateBlock,
        userId: string | null,
        actionStatusId: any
    ): Promise<IPolicyDocument> {
        const {
            owner,
            relayerAccount,
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

        PolicyUtils.setGuardianVersion(vcSubject, outputSchema);

        if (reference) {
            vcSubject.ref = reference;
        }
        if (ref.dryRun) {
            VCHelper.addDryRunContext(vcSubject);
        }

        const uuid = await ref.components.generateUUID();
        const policyOwnerCred = await PolicyUtils.getUserCredentials(ref, ref.policyOwner, userId);
        const didDocument = await policyOwnerCred.loadDidDocument(ref, userId);
        const newVC = await VCHelper.createVerifiableCredential(
            vcSubject,
            didDocument,
            null,
            { uuid }
        );

        const item = PolicyUtils.createVC(ref, owner, newVC, actionStatusId);
        item.type = outputSchema.iri;
        item.schema = outputSchema.iri;
        item.relationships = relationships.length ? relationships : null;
        item.accounts = accounts && Object.keys(accounts).length ? accounts : null;
        item.tokens = tokens && Object.keys(tokens).length ? tokens : null;
        item.relayerAccount = relayerAccount;
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
        ref: IPolicyCalculateBlock,
        recordActionId: string
    ): Promise<IPolicyDocument> {
        const vc = PolicyUtils.createVcFromSubject(json);
        return PolicyUtils.createUnsignedVC(ref, vc, recordActionId);
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
                    const newVC = await this.process(doc, ref, event?.user?.userId, event.actionStatus);
                    result.push(newVC)
                }
                event.data.data = result;
            } else {
                event.data.data = await this.process(event.data.data, ref, event?.user?.userId, event.actionStatus);
            }
        } else {
            event.data.data = await this.process(event.data.data, ref, event?.user?.userId, event.actionStatus);
        }

        ref.triggerEvents(PolicyOutputEventType.RunEvent, event.user, event.data, event.actionStatus);
        ref.triggerEvents(PolicyOutputEventType.ReleaseEvent, event.user, null, event.actionStatus);
        ref.triggerEvents(PolicyOutputEventType.RefreshEvent, event.user, event.data, event.actionStatus);
        PolicyComponentsUtils.ExternalEventFn(new ExternalEvent(ExternalEventType.Run, ref, event.user, {
            documents: ExternalDocuments(event.data?.data)
        }));
        ref.backup();
    }
}
