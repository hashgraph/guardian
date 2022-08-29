import { BlockActionError } from '@policy-engine/errors';
import { ActionCallback, ValidatorBlock } from '@policy-engine/helpers/decorators';
import { CatchErrors } from '@policy-engine/helpers/decorators/catch-errors';
import { IPolicyEvent, PolicyInputEventType, PolicyOutputEventType } from '@policy-engine/interfaces';
import { ChildrenType, ControlType } from '@policy-engine/interfaces/block-about';
import { IPolicyDocument, IPolicyEventState, IPolicyValidatorBlock } from '@policy-engine/policy-engine.interface';
import { PolicyValidationResultsContainer } from '@policy-engine/policy-validation-results-container';
import { PolicyComponentsUtils } from '@policy-engine/policy-components-utils';
import { PolicyUtils } from '@policy-engine/helpers/utils';

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
            PolicyOutputEventType.RefreshEvent
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
    ): Promise<boolean> {
        const documentRef = PolicyUtils.getDocumentRef(document);

        if (!document) {
            return false;
        }

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
            return false;
        }

        const documentType = PolicyUtils.getDocumentType(document);

        if (ref.options.documentType === 'vc-document') {
            if (documentType !== 'VerifiableCredential') {
                return false;
            }
        } else if (ref.options.documentType === 'vp-document') {
            if (documentType !== 'VerifiablePresentation') {
                return false;
            }
        } else if (ref.options.documentType === 'related-vc-document') {
            if (documentType !== 'VerifiableCredential') {
                return false;
            }
        } else if (ref.options.documentType === 'related-vp-document') {
            if (documentType !== 'VerifiablePresentation') {
                return false;
            }
        }

        const userDID = event?.user?.did;
        const userGroup = event?.user?.group;

        if (ref.options.checkOwnerDocument) {
            if (document.owner !== userDID) {
                return false;
            }
        } 
        if (ref.options.checkOwnerByGroupDocument) {
            if (document.group !== userGroup) {
                return false;
            }
        }
        if (ref.options.checkAssignDocument) {
            if (document.assignedTo !== userDID) {
                return false;
            }
        } 
        if (ref.options.checkAssignByGroupDocument) {
            if (document.assignedToGroup !== userGroup) {
                return false;
            }
        }

        if (ref.options.schema) {
            const schema = await ref.databaseServer.getSchemaByIRI(ref.options.schema, ref.topicId);
            if (!PolicyUtils.checkDocumentSchema(document, schema)) {
                return false;
            }
        }

        if (ref.options.conditions) {
            for (const filter of ref.options.conditions) {
                if (!PolicyUtils.checkDocumentField(document, filter)) {
                    return false;
                }
            }
        }

        return true;
    }

    /**
     * Run block logic
     * @param event
     */
    public async run(event: IPolicyEvent<IPolicyEventState>): Promise<boolean> {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyValidatorBlock>(this);

        const document = event?.data?.data;

        if (!document) {
            return false;
        }

        if (Array.isArray(document)) {
            for (const doc of document) {
                if (!(await this.validateDocument(ref, event, doc))) {
                    return false;
                }
            }
            return true;
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
        output: [PolicyOutputEventType.RunEvent, PolicyOutputEventType.RefreshEvent]
    })
    @CatchErrors()
    async runAction(event: IPolicyEvent<IPolicyEventState>): Promise<void> {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyValidatorBlock>(this);
        ref.log(`runAction`);

        const valid = await ref.run(event);
        if (!valid) {
            throw new BlockActionError(`Invalid document`, ref.blockType, ref.uuid);
        }

        ref.triggerEvents(PolicyOutputEventType.RunEvent, event.user, event.data);
        ref.triggerEvents(PolicyOutputEventType.RefreshEvent, event.user, event.data);
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
