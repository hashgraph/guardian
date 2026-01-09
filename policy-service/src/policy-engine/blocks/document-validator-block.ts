import { BlockActionError } from '../errors/index.js';
import { ActionCallback, ValidatorBlock } from '../helpers/decorators/index.js';
import { CatchErrors } from '../helpers/decorators/catch-errors.js';
import { IPolicyEvent, PolicyInputEventType, PolicyOutputEventType } from '../interfaces/index.js';
import { ChildrenType, ControlType } from '../interfaces/block-about.js';
import { AnyBlockType, IPolicyDocument, IPolicyEventState, IPolicyValidatorBlock } from '../policy-engine.interface.js';
import { PolicyComponentsUtils } from '../policy-components-utils.js';
import { PolicyUtils } from '../helpers/utils.js';
import { ExternalDocuments, ExternalEvent, ExternalEventType } from '../interfaces/external-event.js';
import { FilterQuery } from '@mikro-orm/core';
import { VcDocument, VpDocument } from '@guardian/common';
import { LocationType } from '@guardian/interfaces';

/**
 * Document Validator
 */
@ValidatorBlock({
    blockType: 'documentValidatorBlock',
    commonBlock: false,
    actionType: LocationType.LOCAL,
    about: {
        label: 'Validator',
        title: `Add 'Validator' Block`,
        post: false,
        get: false,
        children: ChildrenType.None,
        control: ControlType.Special,
        input: [
            PolicyInputEventType.RunEvent
        ],
        output: [
            PolicyOutputEventType.RunEvent,
            PolicyOutputEventType.RefreshEvent,
            PolicyOutputEventType.ErrorEvent
        ],
        defaultEvent: true
    },
    variables: [
        { path: 'options.schema', alias: 'schema', type: 'Schema' }
    ]
})
export class DocumentValidatorBlock {
    /**
     * Before init callback
     */
    public async beforeInit(): Promise<void> {
        const ref = PolicyComponentsUtils.GetBlockRef<AnyBlockType>(this);
        const documentCacheFields = PolicyComponentsUtils.getDocumentCacheFields(ref.policyId);
        if (ref.options?.documentType === 'related-vc-document') {
            documentCacheFields.add('credentialSubject.0.id');
        }
        if (ref.options?.documentType === 'related-vp-document') {
            documentCacheFields.add('verifiableCredential.credentialSubject.0.id');
        }
    }

    /**
     * Validate Document
     * @param ref
     * @param event
     * @param document
     */
    private async validateDocument(
        ref: IPolicyValidatorBlock,
        event: IPolicyEvent<IPolicyEventState>,
        document: IPolicyDocument
    ): Promise<string> {
        if (!document) {
            return `Invalid document`;
        }

        const documentRef = PolicyUtils.getDocumentRef(document);

        if (ref.options.documentType === 'related-vc-document') {
            if (documentRef) {
                document = await ref.databaseServer.getVcDocument({
                    'policyId': { $eq: ref.policyId },
                    'document.credentialSubject.id': { $eq: documentRef }
                } as FilterQuery<VcDocument>);
            } else {
                document = null;
            }
        }

        if (ref.options.documentType === 'related-vp-document') {
            if (documentRef) {
                document = await ref.databaseServer.getVpDocument({
                    'policyId': ref.policyId,
                    'document.verifiableCredential.credentialSubject.id': { $eq: documentRef }
                } as FilterQuery<VpDocument>);
            } else {
                document = null;
            }
        }

        if (!document) {
            return `Document does not exist`;
        }

        const documentType = PolicyUtils.getDocumentType(document);

        if (ref.options.documentType === 'vc-document') {
            if (documentType !== 'VerifiableCredential') {
                return `Invalid document type`;
            }
        } else if (ref.options.documentType === 'vp-document') {
            if (documentType !== 'VerifiablePresentation') {
                return `Invalid document type`;
            }
        } else if (ref.options.documentType === 'related-vc-document') {
            if (documentType !== 'VerifiableCredential') {
                return `Invalid document type`;
            }
        } else if (ref.options.documentType === 'related-vp-document') {
            if (documentType !== 'VerifiablePresentation') {
                return `Invalid document type`;
            }
        }

        const userDID = event?.user?.did;
        const userGroup = event?.user?.group;

        if (ref.options.checkOwnerDocument) {
            if (document.owner !== userDID) {
                return `Invalid owner`;
            }
        }
        if (ref.options.checkOwnerByGroupDocument) {
            if (document.group !== userGroup) {
                return `Invalid group`;
            }
        }
        if (ref.options.checkAssignDocument) {
            if (document.assignedTo !== userDID) {
                return `Invalid assigned user`;
            }
        }
        if (ref.options.checkAssignByGroupDocument) {
            if (document.assignedToGroup !== userGroup) {
                return `Invalid assigned group`;
            }
        }

        if (ref.options.schema) {
            const schema = await PolicyUtils.loadSchemaByID(ref, ref.options.schema);
            if (!PolicyUtils.checkDocumentSchema(ref, document, schema)) {
                return `Invalid document schema`;
            }
        }

        if (ref.options.conditions) {
            for (const filter of ref.options.conditions) {
                if (!PolicyUtils.checkDocumentField(document, filter)) {
                    return `Invalid document`;
                }
            }
        }

        return null;
    }

    /**
     * Run block logic
     * @param event
     */
    public async run(event: IPolicyEvent<IPolicyEventState>): Promise<string> {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyValidatorBlock>(this);

        const document = event?.data?.data;

        if (!document) {
            return `Invalid document`;
        }

        if (Array.isArray(document)) {
            for (const doc of document) {
                const error = await this.validateDocument(ref, event, doc);
                if (error) {
                    return error;
                }
            }
            return null;
        } else {
            return await this.validateDocument(ref, event, document);
        }
    }

    /**
     * Run block action
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
    async runAction(event: IPolicyEvent<IPolicyEventState>): Promise<any> {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyValidatorBlock>(this);
        ref.log(`runAction`);

        const error = await ref.run(event);
        if (error) {
            throw new BlockActionError(error, ref.blockType, ref.uuid);
        }
        // event.actionStatus.saveResult(event.data);

        await ref.triggerEvents(PolicyOutputEventType.RunEvent, event.user, event.data, event.actionStatus);
        await ref.triggerEvents(PolicyOutputEventType.ReleaseEvent, event.user, null, event.actionStatus);
        await ref.triggerEvents(PolicyOutputEventType.RefreshEvent, event.user, event.data, event.actionStatus);
        PolicyComponentsUtils.ExternalEventFn(new ExternalEvent(ExternalEventType.Run, ref, event?.user, {
            documents: ExternalDocuments(event?.data?.data)
        }));
        ref.backup();

        return event.data;
    }
}
