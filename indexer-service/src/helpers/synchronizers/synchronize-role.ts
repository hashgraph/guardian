import { DataBaseHelper, Message } from '@indexer/common';
import { MessageType } from '@indexer/interfaces';
import { textSearch } from '../text-search-options.js';
import { SynchronizationTask } from '../synchronization-task.js';

export class SynchronizationRoles extends SynchronizationTask {
    public readonly name: string = 'roles';

    constructor(mask: string) {
        super('roles', mask);
    }

    protected override async sync(): Promise<void> {
        const em = DataBaseHelper.getEntityManager();
        const collection = em.getCollection<Message>('message');

        console.log(`Sync Roles: load policies`)
        const policyMap = new Map<string, Message>();
        const policies = collection.find({ type: MessageType.INSTANCE_POLICY });
        while (await policies.hasNext()) {
            const policy = await policies.next();
            if (policy.options?.instanceTopicId) {
                policyMap.set(policy.options.instanceTopicId, policy);
            }
        }

        console.log(`Sync Roles: update data`)
        const roles = collection.find({
            type: MessageType.ROLE_DOCUMENT,
            ...this.filter(),
        });
        while (await roles.hasNext()) {
            const document = await roles.next();
            const row = em.getReference(Message, document._id);
            row.analytics = this.createAnalytics(document, policyMap);
            em.persist(row);
        }
        console.log(`Sync Roles: flush`)
        await em.flush();
    }

    private createAnalytics(
        document: Message,
        policyMap: Map<string, Message>
    ): any {
        const analytics: any = {
            textSearch: textSearch(document),
        };
        const policyMessage = policyMap.get(document.topicId);
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
                    'analytics.textSearch': null,
                },
                {
                    'analytics.policyId': null,
                },
            ],
        };
    }
}