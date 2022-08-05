import { BlockActionError } from '@policy-engine/errors';
import { ActionCallback, ValidatorBlock } from '@policy-engine/helpers/decorators';
import { CatchErrors } from '@policy-engine/helpers/decorators/catch-errors';
import { IPolicyEvent, PolicyInputEventType, PolicyOutputEventType } from '@policy-engine/interfaces';
import { ChildrenType, ControlType } from '@policy-engine/interfaces/block-about';
import { IPolicyValidatorBlock } from '@policy-engine/policy-engine.interface';
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
     * Run block logic
     * @param event
     */
    public async run(event: IPolicyEvent<any>): Promise<boolean> {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyValidatorBlock>(this);

        let document = event?.data?.data;

        if (!document) {
            return false;
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

        if (ref.options.checkOwnerDocument) {
            if (document.owner !== event?.user?.did) {
                return false;
            }
        }

        if (ref.options.checkAssignDocument) {
            if (document.assign !== event?.user?.did) {
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
     * Run block action
     * @event PolicyEventType.Run
     * @param {IPolicyEvent} event
     */
    @ActionCallback({
        output: [PolicyOutputEventType.RunEvent, PolicyOutputEventType.RefreshEvent]
    })
    @CatchErrors()
    async runAction(event: IPolicyEvent<any>): Promise<void> {
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
