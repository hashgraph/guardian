import { getMongoRepository, MongoRepository } from 'typeorm';
import { Settings } from '@entity/settings';
import { HederaSDKHelper } from '@hedera-modules';
import { ApiResponse } from '@api/api-response';
import { Policy } from '@entity/policy';
import { MessageBrokerChannel, MessageResponse, MessageError, Logger } from '@guardian/common';
import { MessageAPI } from '@guardian/interfaces';

export const demoAPI = async function (
    channel: MessageBrokerChannel,
    settingsRepository: MongoRepository<Settings>
): Promise<void> {
    ApiResponse(channel, MessageAPI.GENERATE_DEMO_KEY, async (msg) => {
        try {
            const role = msg?.role;
            const operatorId = await settingsRepository.findOne({
                name: 'OPERATOR_ID'
            });
            const operatorKey = await settingsRepository.findOne({
                name: 'OPERATOR_KEY'
            });
            const OPERATOR_ID = operatorId?.value || process.env.OPERATOR_ID;
            const OPERATOR_KEY = operatorKey?.value || process.env.OPERATOR_KEY;
            let initialBalance = null;
            try {
                if (role === 'STANDARD_REGISTRY') {
                    initialBalance = parseInt(process.env.INITIAL_STANDARD_REGISTRY_BALANCE);
                } else {
                    initialBalance = parseInt(process.env.INITIAL_BALANCE);
                }
            } catch (error) {
                initialBalance = null;
            }
            const client = new HederaSDKHelper(OPERATOR_ID, OPERATOR_KEY);
            const treasury = await client.newAccount(initialBalance);
            return new MessageResponse({
                id: treasury.id.toString(),
                key: treasury.key.toString()
            });
        } catch (error) {
            new Logger().error(error, ['GUARDIAN_SERVICE']);
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
            new Logger().error(error, ['GUARDIAN_SERVICE']);
            return new MessageError(error);
        }
    })
}
