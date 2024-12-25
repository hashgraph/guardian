import { DataBaseHelper, Message } from '@indexer/common';
import { MessageType, MessageAction, IPFS_CID_PATTERN } from '@indexer/interfaces';
import { textSearch } from '../text-search-options.js';
import { SynchronizationTask } from '../synchronization-task.js';
import { Collection } from 'mongodb';

interface LabelAnalytics {
    tokenId?: string,
    labelName?: string,
}

export class SynchronizationLabels extends SynchronizationTask {
    public readonly name: string = 'labels';

    constructor(mask: string) {
        super('labels', mask);
    }

    private async loadLabels(collection: Collection<Message>) {
        console.log(`Sync labels: load labels`)
        const labelMap = new Map<string, Message>();
        const labels = collection.find({
            type: MessageType.POLICY_LABEL,
            action: MessageAction.PublishPolicyLabel
        });
        while (await labels.hasNext()) {
            const label = await labels.next();
            labelMap.set(label.consensusTimestamp, label);
        }
        return labelMap;
    }

    private async loadTargets(collection: Collection<Message>) {
        console.log(`Sync labels: load targets`)
        const targetMap = new Map<string, Message>();
        const targets = collection.find({
            type: MessageType.VP_DOCUMENT
        });
        while (await targets.hasNext()) {
            const target = await targets.next();
            targetMap.set(target.consensusTimestamp, target);
        }
        return targetMap;
    }

    private async loadDocuments(collection: Collection<Message>) {
        console.log(`Sync labels: load documents`)
        const documents = collection.find({
            action: MessageAction.CreateLabelDocument,
            ...this.filter(),
        });
        const allDocuments: Message[] = [];
        while (await documents.hasNext()) {
            const document = await documents.next();
            allDocuments.push(document);
        }
        return allDocuments;
    }

    public override async sync(): Promise<void> {
        const em = DataBaseHelper.getEntityManager();
        const collection = em.getCollection<Message>('message');

        const labelMap = await this.loadLabels(collection);
        const targetMap = await this.loadTargets(collection);
        const needUpdate = await this.loadDocuments(collection);

        console.log(`Sync labels: update data`)
        for (const document of needUpdate) {
            const row = em.getReference(Message, document._id);
            row.analytics = this.createAnalytics(
                document,
                labelMap,
                targetMap,
            );
            em.persist(row);
        }
        console.log(`Sync labels: flush`)
        await em.flush();
    }

    private createAnalytics(
        document: Message,
        labelMap: Map<string, Message>,
        targetMap: Map<string, Message>,
    ): LabelAnalytics {
        const documentAnalytics: LabelAnalytics = document.analytics;
        if (!documentAnalytics) {
            return;
        }
        const target = targetMap.get(document.options?.target);
        if (target) {
            documentAnalytics.tokenId = target.analytics?.tokenId;
        }

        const definition = labelMap.get(document.options?.definition);
        if (definition) {
            documentAnalytics.labelName = definition.options?.name;
        }

        return documentAnalytics;
    }

    private filter() {
        return {
            $or: [
                {
                    'analytics.labelName': null,
                },
            ],
        };
    }
}