import PubSub from './interfaces/PubSub';
import { MessageBrokerChannel } from '@guardian/common';

export default class NatsPubSubAdapter implements PubSub {
  private natsServer!: MessageBrokerChannel;
  async initServer () {
    if (!this.natsServer) {
      const natsConnection = await MessageBrokerChannel.connect('application-events');
      this.natsServer = new MessageBrokerChannel(natsConnection, 'application-events');
    }
  }

  async publish<T> (subject: string, event: T) {
    await this.initServer();
    return this.natsServer.publish<T>(subject, event);
  }

  async subscribe (subject: string, cb: (payload: unknown) => void) {
    await this.initServer();
    return this.natsServer.subscribe(subject, (data: unknown) => {
      console.log(`Received message on "${subject}" subject:`, data);
      cb(data);
    });
  }

}
