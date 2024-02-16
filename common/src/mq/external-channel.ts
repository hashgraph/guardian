import { MessageBrokerChannel } from './message-broker-channel';
import { Singleton } from '../decorators/singleton';

/**
 * External event channel
 */
@Singleton
export class ExternalEventChannel {
    /**
     * Message broker channel
     * @private
     */
    private channel: MessageBrokerChannel;

    /**
     * Register channel
     * @param channel
     */
    public setChannel(channel: MessageBrokerChannel): any {
        this.channel = channel;
    }

    /**
     * Publish message
     * @param type
     * @param data
     */
    public publishMessage(type: string, data: any) {
        this.channel.publish(type, data, true)
    }
}
