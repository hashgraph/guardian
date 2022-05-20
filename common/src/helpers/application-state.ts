import { Singleton } from "../decorators/singleton";
import { MessageBrokerChannel } from "../mq";
import { ApplicationStates, MessageAPI } from "interfaces";
import { MessageResponse, MessageError } from "../models/message-response";

@Singleton
export class ApplicationState {
    private channel: MessageBrokerChannel;
    private state: ApplicationStates;
    private serviceName: string;

    /**
     * Register channel
     * @param channel: MessageBrokerChannel
     */
    public async setChannel(channel: MessageBrokerChannel): Promise<any> {
        this.channel = channel;
        await this.channel.response(MessageAPI.GET_STATUS, async () => {
            try {
                return new MessageResponse(this.state);
            }
            catch (e) {
                return new MessageError(e);
            }
        });
    }

    /**
     * Get channel
     */
    public getChannel(): MessageBrokerChannel {
        return this.channel;
    }

    constructor(serviceName?: string) {
        this.serviceName = serviceName;
    }

    public getState(): ApplicationStates {
        return this.state;
    }

    public async updateState(state: ApplicationStates): Promise<void> {
        this.state = state;
        if (this.serviceName) {
            const res = {};
            res[this.serviceName] = state;
            await this.channel.request([this.channel.channelName, MessageAPI.UPDATE_STATUS].join('.'), res);
        }
    }
}
