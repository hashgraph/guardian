import IConnection from '../connections/db/interfaces/IConnection.js'
import { Webhook } from '../entities/Webhook.js';
import WebhookStore from '../singletons/WebhookStore.js';

export default class WebhookService {
  private webhookStore: WebhookStore;

  constructor (readonly connection: IConnection) {
    this.webhookStore = WebhookStore.getInstance();
  }

  getWebhooks = async (): Promise<Webhook[]> => {
    const webhooks = await this.connection.getAll<Webhook>(Webhook);
    return webhooks || [];
  };

  saveWebhook = async (webhook: Webhook) => {
    await this.connection.save<Webhook>(webhook);
    this.webhookStore.seedWebhookEvents(webhook);
  };

  findWebhook = async (id: string) => {
    return this.connection.find<Webhook>(id, Webhook);
  };

  removeWebhook = async (id: string) => {
    const webhook = await this.findWebhook(id);
    this.webhookStore.removeWebhookEvents(webhook);
    return this.connection.remove<Webhook>(webhook);
  };
}
