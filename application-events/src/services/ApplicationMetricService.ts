import axios from 'axios';
import PubSub from 'connections/pub-subs/interfaces/PubSub';
import WebhookService from './WebhookService';

import {
  PolicyEvents,
  PolicyEngineEvents,
  ExternalMessageEvents
} from '@guardian/interfaces';
import WebhookStore from '../singletons/WebhookStore';

const avoidEvents = [
  'WRITE_LOG',
  'GET_LOGS',
  'GET_ALL_USER_ACCOUNTS_DEMO',
  'GET_USER_BY_TOKEN',
  'SEND_STATUS',
  'GET_USER',
  'GET_BALANCE',
  'GENERATE_NEW_TOKEN',
  'GET_STATUS',
  'get-setting-key',
  'GET_MAP_API_KEY',
];

export const externalMessageEvents = [
  ...(Object.values(ExternalMessageEvents)),
  ...(Object.values(PolicyEvents)),
  ...(Object.values(PolicyEngineEvents)),
].filter((event) => !avoidEvents.includes(event));

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

  async sendEvents (eventName: string, payload: unknown) {
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
      try {
        const sub = this.pubSub.subscribe(subject, (data: unknown) => {
            console.log(`Received message on "${subject}" subject:`, JSON.stringify(data));
            this.sendEvents(subject, data);
        });
        subscriptions.push(sub);
      } catch (e: any) {
        console.error('Unable to parse:', e.message, e.stack);
      }
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
