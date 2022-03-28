import { MessageAPI, MessageError, MessageResponse } from 'interfaces';
import { Logger } from 'logger-helper';
import { HederaHelper } from 'vc-modules';
import { ApiResponse } from '@api/api-response';

export const demoAPI = async function (
    channel: any
): Promise<void> {
    ApiResponse(channel, MessageAPI.GENERATE_DEMO_KEY, async (msg, res) => {
        try {
            const OPERATOR_ID = process.env.OPERATOR_ID;
            const OPERATOR_KEY = process.env.OPERATOR_KEY;
            const treasury = await HederaHelper.setOperator(OPERATOR_ID, OPERATOR_KEY).SDK.newAccount(30);
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
