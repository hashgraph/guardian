import { BlockActionError } from '@policy-engine/errors';
import { ActionCallback, ValidatorBlock } from '@policy-engine/helpers/decorators';
import { CatchErrors } from '@policy-engine/helpers/decorators/catch-errors';
import { IPolicyEvent, PolicyInputEventType, PolicyOutputEventType } from '@policy-engine/interfaces';
import { ChildrenType, ControlType } from '@policy-engine/interfaces/block-about';
import { IPolicyDocument, IPolicyEventState, IPolicyValidatorBlock } from '@policy-engine/policy-engine.interface';
import { PolicyValidationResultsContainer } from '@policy-engine/policy-validation-results-container';
import { PolicyComponentsUtils } from '@policy-engine/policy-components-utils';
import { PolicyUtils } from '@policy-engine/helpers/utils';
import { ExternalDocuments, ExternalEvent, ExternalEventType } from '@policy-engine/interfaces/external-event';

/**
 * Document Validator
 */
@ValidatorBlock({
    blockType: 'documentValidatorBlock',
    commonBlock: false,
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
    }
})
export class DocumentValidatorBlock {

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
                    where: {
                        'policyId': { $eq: ref.policyId },
                        'document.credentialSubject.id': { $eq: documentRef }
                    }
                });
            } else {
                document = null;
            }
        }

        if (ref.options.documentType === 'related-vp-document') {
            if (documentRef) {
                document = await ref.databaseServer.getVpDocument({
                    where: {
                        'policyId': ref.policyId,
                        'document.verifiableCredential.credentialSubject.id': { $eq: documentRef }
                    }
                });
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
            const schema = await ref.databaseServer.getSchemaByIRI(ref.options.schema, ref.topicId);
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
    async runAction(event: IPolicyEvent<IPolicyEventState>): Promise<void> {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyValidatorBlock>(this);
        ref.log(`runAction`);

        const error = await ref.run(event);
        if (error) {
            throw new BlockActionError(error, ref.blockType, ref.uuid);
        }

        ref.triggerEvents(PolicyOutputEventType.RunEvent, event.user, event.data);
        ref.triggerEvents(PolicyOutputEventType.ReleaseEvent, event.user, null);
        ref.triggerEvents(PolicyOutputEventType.RefreshEvent, event.user, event.data);
        PolicyComponentsUtils.ExternalEventFn(new ExternalEvent(ExternalEventType.Run, ref, event?.user, {
            documents: ExternalDocuments(event?.data?.data)
        }));
    }

    /**
     * Validate block options
     * @param resultsContainer
     */
    public async validate(resultsContainer: PolicyValidationResultsContainer): Promise<void> {
        const ref = PolicyComponentsUtils.GetBlockRef(this);
        try {
            const types = [
                'vc-document',
                'vp-document',
                'related-vc-document',
                'related-vp-document'
            ];
            if (types.indexOf(ref.options.documentType) === -1) {
                resultsContainer.addBlockError(ref.uuid, 'Option "documentType" must be one of ' + types.join(','));
            }

            if (ref.options.schema) {
                if (typeof ref.options.schema !== 'string') {
                    resultsContainer.addBlockError(ref.uuid, 'Option "schema" must be a string');
                    return;
                }
                const schema = await ref.databaseServer.getSchemaByIRI(ref.options.schema, ref.topicId);
                if (!schema) {
                    resultsContainer.addBlockError(ref.uuid, `Schema with id "${ref.options.schema}" does not exist`);
                    return;
                }
            }

            if (ref.options.conditions && !Array.isArray(ref.options.conditions)) {
                resultsContainer.addBlockError(ref.uuid, `conditions option must be an array`);
            }
        } catch (error) {
            resultsContainer.addBlockError(ref.uuid, `Unhandled exception ${PolicyUtils.getErrorMessage(error)}`);
        }
    }
}
