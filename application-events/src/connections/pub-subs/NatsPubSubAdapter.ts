import PubSub from './interfaces/PubSub';
import { MessageBrokerChannel } from '@guardian/common';

export default class NatsPubSubAdapter implements PubSub {
  private natsServer!: MessageBrokerChannel;

  async initServer () {
    if (!this.natsServer) {
      const natsConnection = await MessageBrokerChannel.connect('application-events')
      this.natsServer = new MessageBrokerChannel(natsConnection, 'application-events');
    }
  }

  async publish (subject: string, event: JSON) {
    await this.initServer()
    return this.natsServer.publish(subject, JSON.stringify(event))
  }

  async subscribe (subject: string, cb: (payload: JSON) => void) {
    await this.initServer()
    return this.natsServer.subscribe(subject, (data: any) => {
      console.log(`Received message on "${subject}" subject:`, data)
      cb(data)
    });
  }

}
