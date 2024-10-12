import MongodbAdapter from '../connections/db/MongodbAdapter.js';
import NatsPubSubAdapter from '../connections/pub-subs/NatsPubSubAdapter.js';
import WebhookService from './WebhookService.js';
import ApplicationMetricService from './ApplicationMetricService.js';

export default class EventListenerService {
  private readonly dbConnection;
  private readonly natsPubSubAdapter;
  private readonly webhookService;

  constructor () {
    this.dbConnection = new MongodbAdapter();
    this.natsPubSubAdapter = new NatsPubSubAdapter();
    this.webhookService = new WebhookService(this.dbConnection);
  }

  async listen () {
    console.log('Listening NATs');
    const natsService = new ApplicationMetricService(this.natsPubSubAdapter, this.webhookService);
    await natsService.natsSubscriberService();
  }
}
