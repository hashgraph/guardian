import { Logger } from 'logger-helper';
import { getMongoRepository, MongoRepository } from 'typeorm';
import { Settings } from '@entity/settings';
import { HederaSDKHelper } from '@hedera-modules';
import { ApiResponse } from '@api/api-response';
import { Policy } from '@entity/policy';
import { MessageBrokerChannel, MessageResponse, MessageError } from 'common';
import { MessageAPI } from 'interfaces';

export const demoAPI = async function (
    channel: MessageBrokerChannel,
    settingsRepository: MongoRepository<Settings>
): Promise<void> {
    ApiResponse(channel, MessageAPI.GENERATE_DEMO_KEY, async (msg) => {
        try {
            const operatorId = await settingsRepository.findOne({
                name: 'OPERATOR_ID'
            });
            const operatorKey = await settingsRepository.findOne({
                name: 'OPERATOR_KEY'
            });
            const OPERATOR_ID = operatorId?.value || process.env.OPERATOR_ID;
            const OPERATOR_KEY = operatorKey?.value || process.env.OPERATOR_KEY;
            const client = new HederaSDKHelper(OPERATOR_ID, OPERATOR_KEY);
            const treasury = await client.newAccount(30);
            return new MessageResponse({
                id: treasury.id.toString(),
                key: treasury.key.toString()
            });
        } catch (error) {
            new Logger().error(error.message, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    });

    ApiResponse(channel, MessageAPI.GET_USER_ROLES, async (msg) => {
        try {
            const did = msg.did;
            const policies = await getMongoRepository(Policy).find();
            const result = [];
            policies.forEach(p => {
                if (p.registeredUsers[did]) {
                    result.push({
                        name: p.name,
                        version: p.version,
                        role: p.registeredUsers[did]
                    })
                }

            });
            return new MessageResponse(result);
        } catch (error) {
            new Logger().error(error.message, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    })
}
