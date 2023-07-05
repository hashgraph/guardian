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

  registerListeners(): void {
    this.getMessages<any, any>(AuthEvents.MEECO_VERIFY_VP, async (msg) => {
      const ws = this.clients[msg.cid];
      ws.send(JSON.stringify({
        event: 'MEECO_VERIFY_VP',
        data: msg,
      }));
    });

    this.getMessages<any, any>(AuthEvents.MEECO_VERIFY_VP_FAILED, async (msg) => {
      const ws = this.clients[msg.cid];
      ws.send(JSON.stringify({
        event: "MEECO_VERIFY_VP_FAILED",
        data: msg,
      }));
    });
  }

  public async createMeecoAuthRequest(ws): Promise<any> {
    this.clients[ws.id] = ws;

    const vpRequest = await this.sendMessage<any>(AuthEvents.MEECO_AUTH_START, {
      cid: ws.id,
    });

    return {
      redirectUri: vpRequest.redirectUri,
    };
  }

  public async approveSubmission(ws, presentation_request_id: string, submission_id: string): Promise<string> {
    this.clients[ws.id] = ws;

    const vpRequest = await this.sendMessage<any>(AuthEvents.MEECO_APPROVE_SUBMISSION, {
      presentation_request_id,
      submission_id,
      cid: ws.id,
    });
    return vpRequest;
  }

  public async rejectSubmission(ws, presentation_request_id: string, submission_id: string): Promise<string> {
    this.clients[ws.id] = ws;

    const vpRequest = await this.sendMessage<any>(AuthEvents.MEECO_REJECT_SUBMISSION, {
      presentation_request_id,
      submission_id,
      cid: ws.id,
    });
    return vpRequest;
  }

}