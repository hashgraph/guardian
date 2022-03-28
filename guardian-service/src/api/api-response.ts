import { ApplicationState, ApplicationStates } from '@helpers/application-state';
import { MessageInitialization } from 'interfaces';

export function ApiResponse(channel: any, event: any, cb: (msg, res) => Promise<void>): void {
    const state = new ApplicationState();
    channel.response(event, async (msg, res) => {
        if (state.getState() !== ApplicationStates.READY) {
            res.send(new MessageInitialization());
            return;
        }
        await cb(msg, res);
    })
}
