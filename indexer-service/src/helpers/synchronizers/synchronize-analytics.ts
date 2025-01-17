import { DataBaseHelper, Message, Analytics } from '@indexer/common';
import { MessageType, MessageAction } from '@indexer/interfaces';
import { SynchronizationTask } from '../synchronization-task.js';

export class SynchronizationAnalytics extends SynchronizationTask {
    public readonly name: string = 'analytics';

    constructor(mask: string) {
        super('analytics', mask);
    }

    protected override async sync(): Promise<void> {
        const em = DataBaseHelper.getEntityManager();

        const registries = await em.count(Message, {
            type: MessageType.STANDARD_REGISTRY
        });
        const methodologies = await em.count(Message, {
            type: MessageType.POLICY,
            action: MessageAction.CreatePolicy
        });
        const projects = await em.count(Message, {
            type: MessageType.VC_DOCUMENT,
            action: MessageAction.CreateVC
        });

        const totalIssuance = await this.getTotalIssuance();
        const date = new Date();
        await em.persistAndFlush(
            em.create(Analytics, {
                registries,
                methodologies,
                projects,
                totalIssuance,
                date,
            })
        );
    }

    private async getTotalIssuance() {
        const em = DataBaseHelper.getEntityManager();
        const tokens = em.getCollection('token_cache').find();
        let totalSupply = 0;
        while (await tokens.hasNext()) {
            const token = await tokens.next();
            const decimals = parseInt(token.decimals, 10);
            const tokenTotalSupply = parseInt(token.totalSupply, 10);
            if (decimals > 0) {
                totalSupply += tokenTotalSupply / decimals;
            } else {
                totalSupply += tokenTotalSupply;
            }
        }
        return totalSupply;
    }

}