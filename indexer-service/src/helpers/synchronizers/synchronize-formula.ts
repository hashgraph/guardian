import { DataBaseHelper, Message } from '@indexer/common';
import { MessageType, MessageAction, FormulaAnalytics } from '@indexer/interfaces';
import { SynchronizationTask } from '../synchronization-task.js';
import { Collection } from 'mongodb';
import { textSearch } from '../text-search-options.js';
import { parseFormulaFile } from '../parsers/index.js';
import { fastLoadFilesBuffer } from '../load-files.js';

export class SynchronizationFormulas extends SynchronizationTask {
    public readonly name: string = 'formulas';

    constructor(mask: string) {
        super('formulas', mask);
    }

    private async loadFormulas(
        collection: Collection<Message>,
        fileIds: Set<string>
    ) {
        console.log(`Sync formulas: load formulas`)
        const formulas = collection.find({
            type: MessageType.FORMULA,
            action: MessageAction.PublishFormula,
            ...this.filter(),
        }, {
            limit: 100000
        });
        const allDocuments: Message[] = [];
        while (await formulas.hasNext()) {
            const formula = await formulas.next();
            allDocuments.push(formula);
            fileIds.add(formula.files?.[0]);
        }
        return allDocuments;
    }

    private async loadPolicies(collection: Collection<Message>) {
        const policyMap = new Map<string, Message>();
        const policies = collection.find({ type: MessageType.INSTANCE_POLICY });
        while (await policies.hasNext()) {
            const policy = await policies.next();
            if (policy.options?.instanceTopicId) {
                policyMap.set(policy.options.instanceTopicId, policy);
            }
        }
        return policyMap
    }

    public override async sync(): Promise<void> {
        const em = DataBaseHelper.getEntityManager();
        const collection = em.getCollection<Message>('message');

        const fileIds: Set<string> = new Set<string>();
        const needUpdate = await this.loadFormulas(collection, fileIds);

        console.log(`Sync VCs: load policies`)
        const policyMap = await this.loadPolicies(collection);

        console.log(`Sync formulas: load files`, fileIds.size);
        const fileMap = await fastLoadFilesBuffer(fileIds);

        console.log(`Sync formulas: update data`)
        for (const document of needUpdate) {
            const row = em.getReference(Message, document._id);
            row.analytics = await this.createAnalytics(document, policyMap, fileMap);
            em.persist(row);
        }

        console.log(`Sync formulas: flush`)
        await em.flush();
        await em.clear();
    }

    private async createAnalytics(
        document: Message,
        policyMap: Map<string, Message>,
        fileMap: Map<string, Buffer>,
    ): Promise<FormulaAnalytics> {
        const analytics: FormulaAnalytics = {
            textSearch: textSearch(document),
            config: null
        };
        const formulaFileId = document.files[0];
        const formulaFileBuffer = fileMap.get(formulaFileId);
        if (!formulaFileBuffer) {
            return analytics;
        }
        const formulaData = await parseFormulaFile(formulaFileBuffer);
        if (!formulaData) {
            return analytics;
        }
        analytics.config = formulaData.formula;

        const policyMessage = policyMap.get(document.options?.policyInstanceTopicId);
        if (policyMessage) {
            analytics.policyId = policyMessage.consensusTimestamp;
            analytics.textSearch += `|${policyMessage.consensusTimestamp}`;
        }

        return analytics;
    }

    private filter() {
        return {
            $or: [
                {
                    analytics: { $exists: false },
                },
                {
                    analytics: null,
                },
                {
                    analytics: undefined,
                },
                {
                    'analytics.config': null,
                },
            ],
        };
    }
}
