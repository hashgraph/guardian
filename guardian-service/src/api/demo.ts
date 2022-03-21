import { MessageAPI, MessageError, MessageResponse } from 'interfaces';
import { Logger } from 'logger-helper';
import { MongoRepository } from 'typeorm';
import { Settings } from '@entity/settings';
import { HederaSDKHelper } from 'hedera-modules';

export const demoAPI = async function (
    channel: any,
    settingsRepository: MongoRepository<Settings>
): Promise<void> {
    channel.response(MessageAPI.GENERATE_DEMO_KEY, async (msg, res) => {
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
            new Logger().error(error.toString(), ['GUARDIAN_SERVICE']);
            res.send(new MessageError(error));
        }
    })
}