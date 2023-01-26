import { MessageBrokerChannel } from '@guardian/common';
import { PolicyEvents } from '@guardian/interfaces';
import { BlockTreeGenerator } from '@policy-engine/block-tree-generator';
import { DatabaseServer } from 'guardian-service/dist/database-modules';

const models = [];

/**
 * Connect to the message broker methods of working with schemas.
 *
 * @param channel - channel
 */
export async function policyAPI(channel: MessageBrokerChannel): Promise<void> {
    channel.subscribe(PolicyEvents.GENERATE_POLICY, async (data: any) => {
        const {
            policy,
            // policyId,
            skipRegistration,
            resultsContainer
        } = data;
        const generator = new BlockTreeGenerator();
        const p = await generator.generate(policy, skipRegistration, resultsContainer);
        models.push(p);
    });
}
