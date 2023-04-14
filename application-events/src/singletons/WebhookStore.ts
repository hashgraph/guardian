import { Webhook } from '../entities/Webhook';

export default class WebhookStore {
  private static instance: WebhookStore;
  private webhooks: { [eventName: string]: string[] } = {};

  public async initEvents(webhooks: Webhook[]) {
    for (const webhook of webhooks) {
      this.seedWebhookEvents(webhook);
    }
  }

  /**
   * Seed webhooks
   * @param webhook
   */
  public seedWebhookEvents(webhook: Webhook) {
    if (webhook.events.length) {
      for (const event of webhook.events) {
        this.addWebhook(event, webhook.url);
      }
    }
  }

  /**
   * Unregister webhook for all events
   * @param webhook
   */
  public removeWebhookEvents(webhook: Webhook) {
    if (this.webhooks.length) {
      for (const event of webhook.events) {
        const index = this.webhooks[event].indexOf(webhook.url)
        if (index !== -1) {
          this.webhooks[event].splice(index, 1);
        }
      }
    }
  }

  /**
   * Get class instance
   */
  public static getInstance(): WebhookStore {
    if (!WebhookStore.instance) {
      WebhookStore.instance = new WebhookStore();
    }
    return WebhookStore.instance;
  }

  /**
   * Add webhook event
   * @param eventName
   * @param url
   */
  public addWebhook(eventName: string, url: string): void {
    if (!this.webhooks[eventName]) {
      this.webhooks[eventName] = [];
    }
    if (!this.webhooks[eventName].includes(url)) {
      this.webhooks[eventName].push(url);
    }
  }

  /**
   * Get webhooks of an event
   * @param eventName
   */
  public getWebhooks(eventName: string): string[] {
    return this.webhooks[eventName] || [];
  }
}
