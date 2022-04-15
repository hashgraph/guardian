import { MessageAPI, MessageError, MessageResponse } from 'interfaces';
import { Logger } from 'logger-helper';
import { getMongoRepository, MongoRepository } from 'typeorm';
import { Settings } from '@entity/settings';
import { HederaSDKHelper } from '@hedera-modules';
import { ApiResponse } from '@api/api-response';
import { Policy } from '@entity/policy';

export const demoAPI = async function (
    channel: any,
    settingsRepository: MongoRepository<Settings>
): Promise<void> {
    ApiResponse(channel, MessageAPI.GENERATE_DEMO_KEY, async (msg, res) => {
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
            res.send(new MessageResponse({
                id: treasury.id.toString(),
                key: treasury.key.toString()
            }));
        } catch (error) {
            new Logger().error(error.message, ['GUARDIAN_SERVICE']);
            res.send(new MessageError(error));
        }
    });

    ApiResponse(channel, MessageAPI.GET_USER_ROLES, async (msg, res) => {
        try {
            const did = msg.payload.did;
            const policies = await getMongoRepository(Policy).find();
            const result = [];
            policies.forEach(p => {
                if(p.registeredUsers[did]) {
                    result.push({
                        name: p.name,
                        version: p.version,
                        role: p.registeredUsers[did]
                    })
                }

            });
            res.send(new MessageResponse(result));
        } catch (error) {
            new Logger().error(error.message, ['GUARDIAN_SERVICE']);
            res.send(new MessageError(error));
        }
    })
}
