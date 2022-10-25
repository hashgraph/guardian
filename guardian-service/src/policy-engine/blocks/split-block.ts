import { IPolicyEvent, PolicyInputEventType, PolicyOutputEventType } from '@policy-engine/interfaces';
import { ChildrenType, ControlType, PropertyType } from '@policy-engine/interfaces/block-about';
import { PolicyComponentsUtils } from '../policy-components-utils';
import { ActionCallback, BasicBlock } from '@policy-engine/helpers/decorators';
import { PolicyValidationResultsContainer } from '@policy-engine/policy-validation-results-container';
import { IPolicyBlock, IPolicyDocument, IPolicyEventState } from '@policy-engine/policy-engine.interface';
import { CatchErrors } from '@policy-engine/helpers/decorators/catch-errors';
import { IHederaAccount, PolicyUtils } from '@policy-engine/helpers/utils';
import { IPolicyUser } from '@policy-engine/policy-user';
import { SplitDocuments } from '@entity/split-documents';
import { VcHelper } from '@helpers/vc-helper';
import { Inject } from '@helpers/decorators/inject';
import { VcDocument } from '@hedera-modules';

/**
 * Split block
 */
@BasicBlock({
    blockType: 'splitBlock',
    commonBlock: false,
    about: {
        label: 'Split Block',
        title: `Add 'Split' Block`,
        post: false,
        get: false,
        children: ChildrenType.None,
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
            name: 'threshold',
            label: 'Threshold',
            title: 'Threshold',
            type: PropertyType.Input
        }, {
            name: 'sourceField',
            label: 'Source field',
            title: 'Source field',
            type: PropertyType.Path
        }]
    }
})
export class SplitBlock {
    /**
     * VC helper
     * @private
     */
    @Inject()
    private readonly vcHelper: VcHelper;

    /**
     * Get value
     * @param ref
     * @param doc
     */
    private async calcDocValue(ref: IPolicyBlock, doc: IPolicyDocument): Promise<number> {
        try {
            const value = PolicyUtils.getObjectValue<any>(doc, ref.options.sourceField);
            return parseFloat(value);
        } catch (error) {
            return 0;
        }
    }

    /**
     * Create New Doc
     * @param ref
     * @param root
     * @param document
     * @param newValue
     */
    private async createNewDoc(
        ref: IPolicyBlock,
        root: IHederaAccount,
        document: IPolicyDocument,
        newValue: number
    ): Promise<IPolicyDocument> {
        let clone = PolicyUtils.cloneVC(ref, document);
        clone.document = JSON.parse(JSON.stringify(clone.document));
        PolicyUtils.setObjectValue(clone, ref.options.sourceField, newValue);
        let vc = VcDocument.fromJsonTree(clone.document);
        vc = await this.vcHelper.issueVC(root.did, root.hederaAccountKey, vc);
        clone.document = vc.toJsonTree();
        clone.hash = vc.toCredentialHash();
        clone = PolicyUtils.setDocumentRef(clone, document);
        return clone;
    }

    /**
     * Split Doc
     * @param ref
     * @param root
     * @param user
     * @param result
     * @param residue
     * @param document
     */
    private async split(
        ref: IPolicyBlock,
        root: IHederaAccount,
        user: IPolicyUser,
        result: SplitDocuments[][],
        residue: SplitDocuments[],
        document: IPolicyDocument
    ) {
        const threshold = parseFloat(ref.options.threshold);
        const value = await this.calcDocValue(ref, document);

        let sum = 0;
        for (const item of residue) {
            sum += item.value;
        }

        let needed = threshold - sum;
        if (needed <= 0) {
            result.push(residue);
            residue = [];
            needed = threshold;
        }

        if (value < needed) {
            residue.push(ref.databaseServer.createResidue(
                ref.policyId,
                ref.uuid,
                user.id,
                value,
                document
            ));
        } else {
            const newDoc1 = await this.createNewDoc(ref, root, document, needed);
            residue.push(ref.databaseServer.createResidue(
                ref.policyId,
                ref.uuid,
                user.id,
                needed,
                newDoc1
            ));
            result.push(residue);
            residue = [];

            const count = Math.floor((value - needed) / threshold);
            const end = value - needed - (count * threshold);
            if (count > 0) {
                for (let i = 0; i < count; i++) {
                    const newDocN = await this.createNewDoc(ref, root, document, threshold);
                    result.push([ref.databaseServer.createResidue(
                        ref.policyId,
                        ref.uuid,
                        user.id,
                        threshold,
                        newDocN
                    )]);
                }
            }
            if (end > 0) {
                const newDocL = await this.createNewDoc(ref, root, document, end);
                residue.push(ref.databaseServer.createResidue(
                    ref.policyId,
                    ref.uuid,
                    user.id,
                    end,
                    newDocL
                ));
            }
        }
        return residue;
    }

    /**
     * Add Docs
     * @param ref
     * @param user
     * @param documents
     */
    private async addDocs(ref: IPolicyBlock, user: IPolicyUser, documents: IPolicyDocument[]) {
        const residue = await ref.databaseServer.getResidue(ref.policyId, ref.uuid, user.id);
        const root = await PolicyUtils.getHederaAccount(ref, ref.policyOwner);

        let current = residue;

        const data: SplitDocuments[][] = [];
        for (const document of documents) {
            current = await this.split(ref, root, user, data, current, document);
        }

        await ref.databaseServer.removeResidue(residue);
        await ref.databaseServer.setResidue(current);

        for (const chunk of data) {
            const state = { data: chunk.map(c => c.document) };
            ref.triggerEvents(PolicyOutputEventType.RunEvent, user, state);
        }
        ref.triggerEvents(PolicyOutputEventType.RefreshEvent, user, { data: documents });
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
    async runAction(event: IPolicyEvent<IPolicyEventState>) {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyBlock>(this);
        ref.log(`runAction`);
        const docs: IPolicyDocument | IPolicyDocument[] = event.data.data;
        if (Array.isArray(docs)) {
            await this.addDocs(ref, event.user, docs);
        } else {
            await this.addDocs(ref, event.user, [docs]);
        }
    }

    /**
     * Validate block data
     * @param resultsContainer
     */
    public async validate(resultsContainer: PolicyValidationResultsContainer): Promise<void> {
        const ref = PolicyComponentsUtils.GetBlockRef(this);
        try {
            if (!ref.options.threshold) {
                resultsContainer.addBlockError(ref.uuid, 'Option "threshold" does not set');
            } else {
                try {
                    parseFloat(ref.options.threshold);
                } catch (error) {
                    resultsContainer.addBlockError(ref.uuid, 'Option "threshold" must be a Number');
                }
            }
        } catch (error) {
            resultsContainer.addBlockError(ref.uuid, `Unhandled exception ${PolicyUtils.getErrorMessage(error)}`);
        }
    }
}
