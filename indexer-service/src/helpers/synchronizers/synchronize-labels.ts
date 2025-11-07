import { DataBaseHelper, Message } from '@indexer/common';
import { MessageType, MessageAction, LabelAnalytics, VPAnalytics } from '@indexer/interfaces';
import { SynchronizationTask } from '../synchronization-task.js';
import { Collection } from 'mongodb';
import { textSearch } from '../text-search-options.js';
import { parseLabelFile } from '../parsers/index.js';
import { fastLoadFilesBuffer } from '../load-files.js';

export class SynchronizationLabels extends SynchronizationTask {
    public readonly name: string = 'labels';

    constructor(mask: string) {
        super('labels', mask);
    }

    private async loadAllLabels(collection: Collection<Message>) {
        console.log(`Sync labels: load all labels`)
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

    private async loadLabels(
        collection: Collection<Message>,
        fileIds: Set<string>
    ) {
        console.log(`Sync labels: load labels`)
        const labels = collection.find({
            type: MessageType.POLICY_LABEL,
            action: MessageAction.PublishPolicyLabel,
            ...this.filter1(),
        });
        const allDocuments: Message[] = [];
        while (await labels.hasNext()) {
            const label = await labels.next();
            allDocuments.push(label);
            fileIds.add(label.files?.[0]);
        }
        return allDocuments;
    }

    private async loadDocuments(collection: Collection<Message>) {
        console.log(`Sync labels: load documents`)
        const documents = collection.find({
            action: MessageAction.CreateLabelDocument,
            ...this.filter2(),
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

        const fileIds: Set<string> = new Set<string>();
        const labelMap = await this.loadAllLabels(collection);
        const targetMap = await this.loadTargets(collection);
        const needUpdate1 = await this.loadLabels(collection, fileIds);
        const needUpdate2 = await this.loadDocuments(collection);

        console.log(`Sync labels: load files`, fileIds.size);
        const fileMap = await fastLoadFilesBuffer(fileIds);

        console.log(`Sync labels: update data`)
        for (const document of needUpdate1) {
            const row = em.getReference(Message, document._id);
            row.analytics = await this.createAnalytics1(document, fileMap);
            em.persist(row);
        }

        console.log(`Sync label documents: update data`)
        for (const document of needUpdate2) {
            const row = em.getReference(Message, document._id);
            row.analytics = this.createAnalytics2(document, labelMap, targetMap);
            em.persist(row);
        }
        console.log(`Sync labels: flush`)
        await em.flush();
        await em.clear();
    }

    private async createAnalytics1(
        document: Message,
        fileMap: Map<string, Buffer>,
    ): Promise<LabelAnalytics> {
        const analytics: LabelAnalytics = {
            textSearch: textSearch(document),
            config: null
        };
        const labelFileId = document.files[0];
        const labelFileBuffer = fileMap.get(labelFileId);
        if (!labelFileBuffer) {
            return analytics;
        }
        const labelData = await parseLabelFile(labelFileBuffer);
        if (!labelData) {
            return analytics;
        }
        analytics.config = labelData.label;
        return analytics;
    }

    private createAnalytics2(
        document: Message,
        labelMap: Map<string, Message>,
        targetMap: Map<string, Message>,
    ): VPAnalytics {
        const analytics: VPAnalytics = document.analytics;
        if (!analytics) {
            return;
        }
        const target = targetMap.get(document.options?.target);
        if (target) {
            analytics.tokenId = target.analytics?.tokenId;
        }

        const definition = labelMap.get(document.options?.definition);
        if (definition) {
            analytics.labelName = definition.options?.name;
        }

        return analytics;
    }

    private filter1() {
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

    private filter2() {
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
                    'analytics.textSearch': undefined,
                },
                {
                    'analytics.tokenId': undefined,
                },
            ],
        };
    }
}
