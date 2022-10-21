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
     * @param doc
     * @param newValue
     */
    private async createNewDoc(
        ref: IPolicyBlock,
        doc: IPolicyDocument,
        newValue: number
    ): Promise<IPolicyDocument> {
        const clone = JSON.parse(JSON.stringify(doc));
        PolicyUtils.setObjectValue(clone, ref.options.sourceField, newValue);
        return clone;
    }

    /**
     * Split Doc
     * @param ref
     * @param user
     * @param result
     * @param residue
     * @param document
     */
    private async split(
        ref: IPolicyBlock,
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
            const newDoc = await this.createNewDoc(ref, document, needed);
            residue.push(ref.databaseServer.createResidue(
                ref.policyId,
                ref.uuid,
                user.id,
                needed,
                newDoc
            ));
            result.push(residue);
            residue = [];

            const count = Math.floor((value - needed) / threshold);
            const end = value - needed - (count * threshold);
            if (count > 0) {
                for (let i = 0; i < count; i++) {
                    const newDoc = await this.createNewDoc(ref, document, threshold);
                    result.push([ref.databaseServer.createResidue(
                        ref.policyId,
                        ref.uuid,
                        user.id,
                        threshold,
                        newDoc
                    )]);
                }
            }
            if (end > 0) {
                const newDoc = await this.createNewDoc(ref, document, end);
                residue.push(ref.databaseServer.createResidue(
                    ref.policyId,
                    ref.uuid,
                    user.id,
                    end,
                    newDoc
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
        let current = residue;

        console.log('!! start', current.map(e => {
            return {
                field0: e.document.document.credentialSubject[0].field0,
                field1: e.document.document.credentialSubject[0].field1
            }
        }
        ));

        const data: SplitDocuments[][] = [];
        for (const document of documents) {
            current = await this.split(ref, user, data, current, document);
        }

        console.log('!! residue', current.map(e => {
            return {
                field0: e.document.document.credentialSubject[0].field0,
                field1: e.document.document.credentialSubject[0].field1
            }
        }));
        console.log('!! data', data.map(m => {
            return m.map(e => {
                return {
                    field0: e.document.document.credentialSubject[0].field0,
                    field1: e.document.document.credentialSubject[0].field1
                }
            })
        }));

        await ref.databaseServer.removeResidue(residue);
        await ref.databaseServer.setResidue(current);

        for (const chunk of data) {
            const state = { data: chunk.map(c => c.document) };
            ref.triggerEvents(PolicyOutputEventType.RunEvent, user, state);

            console.log('55555');
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

        console.log('11111111');
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

        } catch (error) {
            resultsContainer.addBlockError(ref.uuid, `Unhandled exception ${PolicyUtils.getErrorMessage(error)}`);
        }
    }
}
