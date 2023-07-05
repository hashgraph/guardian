import {Singleton} from '@helpers/decorators/singleton';
import { AuthEvents, GenerateUUIDv4 } from '@guardian/interfaces';
import { NatsService } from '@guardian/common';

/**
 * Users setvice
 */
@Singleton
export class MeecoAuth extends NatsService {
  /**
   * Queue name
  */
  public messageQueueName = 'api-meeco-auth-queue';

  /**
   * Reply subject
   * @private
   */
  public replySubject = 'api-meeco-auth-queue-reply-' + GenerateUUIDv4();

  private clients: any = {};


  public async createMeecoAuthRequest(ws): Promise<any> {
    this.clients[ws.id] = ws;

    const vpRequest = await this.sendMessage<any>(AuthEvents.MEECO_AUTH_START, {
      cid: ws.id,
    });

    return {
      redirectUri: vpRequest.redirectUri,
    };
  }

}