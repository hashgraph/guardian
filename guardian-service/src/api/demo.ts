import { MessageAPI, MessageError, MessageResponse } from 'interfaces';
import { HederaHelper } from 'vc-modules';

export const demoAPI = async function (
    channel: any
): Promise<void> {
    channel.response(MessageAPI.GENERATE_DEMO_KEY, async (msg, res) => {
        try {
            console.log("test")
            const OPERATOR_ID = process.env.OPERATOR_ID;
            const OPERATOR_KEY = process.env.OPERATOR_KEY;
            const treasury = await HederaHelper.setOperator(OPERATOR_ID, OPERATOR_KEY).SDK.newAccount(30);
            res.send(new MessageResponse({
                id: treasury.id.toString(),
                key: treasury.key.toString()
            }));
        } catch (error) {
            res.send(new MessageError(error));
        }
    })
}