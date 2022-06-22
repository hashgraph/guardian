import { MessageBrokerChannel } from "./message-broker-channel";
import { Singleton } from "../decorators/singleton";

@Singleton
export class ExternalEventChannel {
    constructor() { }

    private channel: MessageBrokerChannel;

    /**
     * Register channel
     * @param channel
     */
    public setChannel(channel: MessageBrokerChannel): any {
        this.channel = channel;
    }

    public publishMessage(type: string, data: any) {
        this.channel.publish(type, data, true)
    }
}