import axios from 'axios';
import PubSub from 'connections/pub-subs/interfaces/PubSub';
import WebhookService from './WebhookService';

import {
  PolicyEvents,
  AuthEvents,
  PolicyEngineEvents,
  WalletEvents,
  MessageAPI,
  ExternalMessageEvents
} from '@guardian/interfaces';
import WebhookStore from '../singletons/WebhookStore';

export const externalMessageEvents = [
  ...(Object.values(AuthEvents)),
  ...(Object.values(ExternalMessageEvents)),
  ...(Object.values(PolicyEvents)),
  ...(Object.values(PolicyEngineEvents)),
  ...(Object.values(WalletEvents)),
  ...(Object.values(MessageAPI)),
];

export default class ApplicationMetricService {
  private webhookStore: WebhookStore;
  constructor (readonly pubSub: PubSub, readonly webhookService: WebhookService) {
    this.webhookStore = WebhookStore.getInstance();
    this.init();
  }

  async init () {
    console.log('Init')
    await this.webhookStore.initEvents(await this.webhookService.getWebhooks())
  }

  async sendEvents (eventName: string, payload: JSON) {
    const webhooks = this.webhookStore.getWebhooks(eventName);
    if (!webhooks || !webhooks?.length) {
      return;
    }

    const headers = {
      'Content-Type': 'application/json',
    };
    for (const webhook of webhooks) {
      try {
        const { data } = await axios.post(webhook, payload, { headers })
        console.log('Webhook response:', JSON.stringify(data));
      } catch (e: any) {
        console.error('Webhook response:', e.message);
      }
    }
  };

  async natsSubscriberService () {
    const subscriptions: any[] = [];

    for (const subject of externalMessageEvents) {
      console.log('Subject:', subject);
      const sub = this.pubSub.subscribe(subject, (data: any) => {
        console.log(`Received message on "${subject}" subject:`, JSON.stringify(data));
        this.sendEvents(subject, data);
      });
      subscriptions.push(sub);
    }

    process.on('SIGTERM', async () => {
      console.info('SIGTERM signal received.');
      for (const sub of subscriptions) {
        await sub.unsubscribe();
      }

      console.log('Unsubscribed and disconnected from NATS');
    });
  };
};
