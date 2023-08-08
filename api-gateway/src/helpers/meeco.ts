import { Singleton } from '@helpers/decorators/singleton';
import { AuthEvents, GenerateUUIDv4 } from '@guardian/interfaces';
import { CredentialSubject, generateNumberFromString, MeecoApprovedSubmission, MeecoJwt, NatsService, Vc, VerifiableCredential } from '@guardian/common';
import * as jwt from 'jsonwebtoken';

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

  private readonly clients: any = {};

  static extractUserFromApprovedMeecoToken(meecoApprovedSubmission: MeecoApprovedSubmission): CredentialSubject {
    const vc = MeecoAuth.extractVerifiableCredentialFromMeecoToken(meecoApprovedSubmission);
    return vc.credentialSubject;
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

  registerListeners(): void {
    this.getMessages<any, any>(AuthEvents.MEECO_VERIFY_VP, async (msg) => {
      const ws = this.clients[msg.cid];
      const credentialSubject: CredentialSubject = msg.vc;
      const providerUsername = `${credentialSubject.firstName}${credentialSubject.familyName}${
        generateNumberFromString(credentialSubject.id)
      }`.toLowerCase();
      const user = await this.sendMessage<any>(AuthEvents.GET_USER, { username: providerUsername });
      msg.role = user?.role || null;
      ws.send(JSON.stringify({
        event: 'MEECO_VERIFY_VP',
        data: msg,
      }));
    });

    this.getMessages<any, any>(AuthEvents.MEECO_VERIFY_VP_FAILED, async (msg) => {
      const ws = this.clients[msg.cid];
      ws.send(JSON.stringify({
        event: 'MEECO_VERIFY_VP_FAILED',
        data: msg,
      }));
    });
  }

  static extractVerifiableCredentialFromMeecoToken(meecoApprovedSubmission: MeecoApprovedSubmission): Vc {
    const meecoJwt = jwt.decode(meecoApprovedSubmission.vpRequest.submission.vp_token) as MeecoJwt;
    const meecoVerifiableCredentials = jwt.decode(meecoJwt.vp.verifiableCredential[0]) as VerifiableCredential;
    return meecoVerifiableCredentials.vc;
  }

  public async approveSubmission(ws, presentationRequestId: string, submissionId: string): Promise<any> {
    this.clients[ws.id] = ws;

    return await this.sendMessage<any>(AuthEvents.MEECO_APPROVE_SUBMISSION, {
      presentation_request_id: presentationRequestId,
      submission_id: submissionId,
      cid: ws.id,
    });
  }

  public async rejectSubmission(ws, presentationRequestId: string, submissionId: string): Promise<string> {
    this.clients[ws.id] = ws;

    return await this.sendMessage<any>(AuthEvents.MEECO_REJECT_SUBMISSION, {
      presentation_request_id: presentationRequestId,
      submission_id: submissionId,
      cid: ws.id,
    });
  }

}
