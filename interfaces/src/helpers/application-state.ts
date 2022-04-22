import { Singleton } from "../decorators/singleton";
import { IMessageResponse, MessageError, MessageResponse } from "../models/message-response";
import { ApplicationStates } from "../type/application-states.type";
import { MessageAPI } from "../type/message-api.type";

@Singleton
export class ApplicationState {
    private channel: any;
    private state: ApplicationStates;
    private readonly target: string = "api-gateway";
    private serviceName: string;

    /**
     * Register channel
     * @param channel
     */
    public setChannel(channel: any): any {
        this.channel = channel;
        this.channel.response(MessageAPI.GET_STATUS, async (msg, res) => {
            try {
                res.send(new MessageResponse(this.state));
            }
            catch (e) {
                res.send(new MessageError(e));
            }
        });
    }
    
    /**
     * Get channel
     */
    public getChannel(): any {
        return this.channel;
    }

    constructor(serviceName?: string) {
        this.serviceName = serviceName;
    }

    public getState(): ApplicationStates {
        return this.state;
    }

    public updateState(state: ApplicationStates): void {
        this.state = state;
        if (this.serviceName) {
            const res = {};
            res[this.serviceName] = state;
            this.channel.request(this.target, MessageAPI.UPDATE_STATUS, res, 'json');
        }
    }
}
