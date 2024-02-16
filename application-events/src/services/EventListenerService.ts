import MongodbAdapter from '../connections/db/MongodbAdapter';
import NatsPubSubAdapter from '../connections/pub-subs/NatsPubSubAdapter';
import WebhookService from './WebhookService';
import ApplicationMetricService from './ApplicationMetricService';

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
