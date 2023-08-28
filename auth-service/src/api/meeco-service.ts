import { DataBaseHelper, MessageResponse, NatsService, Singleton, Vc, VerifiableCredential } from '@guardian/common';
import { AuthEvents, ExternalProviders, GenerateUUIDv4 } from '@guardian/interfaces';
import { MeecoService } from '../meeco/meeco.service';
import { Logger } from '@nestjs/common';
import { MeecoIssuerWhitelist } from '@entity/meeco-issuer-whitelist';

const MeecoConfig = {
  baseUrl: process.env.MEECO_BASE_URL,
  oauth: {
    url: process.env.MEECO_OAUTH_URL,
    clientId: process.env.MEECO_OAUTH_CLIENT_ID,
    clientSecret: process.env.MEECO_OAUTH_SECRET_ID,
    scope: process.env.MEECO_OAUTH_SCOPE,
    grantType: process.env.MEECO_OAUTH_GRANT_TYPE,
  },
  meecoOrganizationId: process.env.MEECO_ORGANIZATION_ID,
}
const MeecoPassphrase = process.env.MEECO_PASSPHRASE;

@Singleton
export class MeecoAuthService extends NatsService {
  private readonly logger = new Logger('MeecoAuthService');

  /**
   * Message queue name
   */
  public messageQueueName = 'meeco-auth-queue';

  /**
   * Reply subject
   * @private
   */
  public replySubject = 'meeco-auth-queue-reply-' + GenerateUUIDv4();

  /**
   * Meeco service instance
   */
  meecoService: MeecoService;

  constructor() {
    super();
    this.migrateMeecoIssuerWhitelist().then();
    this.meecoService = new MeecoService(MeecoConfig, MeecoPassphrase);
  }

  async migrateMeecoIssuerWhitelist(): Promise<void> {
    if (!process.env.MEECO_ISSUER_ORGANIZATION_ID || !process.env.MEECO_ISSUER_ORGANIZATION_NAME) {
      console.log('MEECO_ISSUER_ORGANIZATION_ID and/or MEECO_ISSUER_ORGANIZATION_NAME are not set');
      return;
    }

    const issuerWhitelistRepository = new DataBaseHelper(MeecoIssuerWhitelist);
    const issuerWhitelist = await issuerWhitelistRepository.findOne({
      issuerId: process.env.MEECO_ISSUER_ORGANIZATION_ID, name: process.env.MEECO_ISSUER_ORGANIZATION_NAME });

    if (!issuerWhitelist) {
      const _issuerWhitelist = new MeecoIssuerWhitelist();
      _issuerWhitelist.issuerId = process.env.MEECO_ISSUER_ORGANIZATION_ID;
      _issuerWhitelist.name = process.env.MEECO_ISSUER_ORGANIZATION_NAME;
      issuerWhitelistRepository.save(_issuerWhitelist);
    }
  }

  /**
   * Register listeners
   */
  registerListeners(): void {
    /**
     * Subscribe to MEECO_AUTH_START event
     * Request a new VP presentation request from Meeco and return the redirect URI
     */
    this.getMessages<any, any>(AuthEvents.MEECO_AUTH_START, async (msg) => {
      // generate a random UUID as the request name
      const requestName = GenerateUUIDv4();

      const clientDID = process.env.MEECO_ISSUER_ORGANIZATION_ID;
      const clientName = process.env.MEECO_ISSUER_ORGANIZATION_NAME;
      const presentationDefinitionId = process.env.MEECO_PRESENTATION_DEFINITION_ID;

      try {
        // create a new VP presentation request from Meeco
        const vpRequest = await this.meecoService.createPresentationRequest(
          requestName,
          clientDID,
          clientName,
          presentationDefinitionId,
        );

        // sign the VP request token
        const signVPRequest = await this.meecoService.signPresentationRequestToken(vpRequest.presentation_request.id, vpRequest.presentation_request.tokens.unsigned_request_jwt);
        const redirectUri = await this.meecoService.getVPSubmissionRedirectUri(signVPRequest.presentation_request.id);

        // start polling for VP submission
        await this.getVPSubmissions(signVPRequest.presentation_request.id, msg.cid);

        // return the redirect URI to client
        return new MessageResponse({redirectUri, cid: msg.cid});
      } catch(ex) {
        // return the error to client
        this.logger.error(ex.message, ex.stack);
        return new MessageResponse({error: ex.message, cid: msg.cid});
      }
    });

    /**
     * Subscribe to MEECO_APPROVE_SUBMISSION event from user
     * Approves the VP presented by user
     * @param msg
     */
    this.getMessages<any, any>(AuthEvents.MEECO_APPROVE_SUBMISSION, async (msg: any) => {
      const vpRequest = await this.meecoService.approveVPSubmission(msg.presentation_request_id, msg.submission_id, true);
      return new MessageResponse({vpRequest, cid: msg.cid, role: msg.role});
    });

    /**
     * Subscribe to MEECO_APPROVE_SUBMISSION event from user
     * Verify the VP presented by user
     * @param msg
     */
    this.getMessages<any, any>(AuthEvents.MEECO_REJECT_SUBMISSION, async (msg: any) => {
      const vpRequest = await this.meecoService.approveVPSubmission(msg.presentation_request_id, msg.submission_id, false);
      return new MessageResponse({vpRequest, cid: msg.cid});
    });
  }

  /**
   * getVPSubmission Queries the Meeco API for the Verifiable Presentation Submission if submitted by user.
   * @param requestId presentation request id
   * @param cid client connection id
   */
  private async getVPSubmissions(requestId: string, cid: string): Promise<void> {
    // poll for VP submission for 60 seconds every 3 seconds
    let userProviderFound;
    let maxIterations = 20;
    const interval = setInterval(async () => {
      try {
        const submissions = await this.meecoService.getVPSubmissions(requestId);

        if (submissions.submissions.length > 0) {
          const { id: submissionId, id_token, vp_token, presentation_request_id } = submissions.submissions[0];

          await this.verifyVP(vp_token);

          const verified = await this.meecoService.verifyVP(id_token, requestId, vp_token);
          if (!verified) {
            throw new Error('VP verification failed by Meeco');
          }

          const verifiableCredential: VerifiableCredential = this.meecoService.decodeVPToken(vp_token);
          const { success, message } = await this.validateCredentials(verifiableCredential.vc);
          if (!success) {
            throw new Error(message);
          }

          if (!userProviderFound) {
            userProviderFound = await this.sendMessage(
              AuthEvents.GET_USER_BY_PROVIDER_USER_DATA,
              {
                providerId: verifiableCredential.vc.credentialSubject.id,
                provider: ExternalProviders.MEECO,
              }
            );
          }

          this.sendMessage(
            AuthEvents.MEECO_VERIFY_VP,
            {
              vc: verifiableCredential.vc.credentialSubject,
              presentation_request_id,
              submission_id: submissionId,
              cid,
              role: userProviderFound?.role || null,
            }
          );
          clearInterval(interval);
        }
      } catch (ex) {
        this.logger.error(ex);
        clearInterval(interval);
        this.sendMessage(
          AuthEvents.MEECO_VERIFY_VP_FAILED,
          {
            error: ex.message,
            cid,
          }
        );
      }

      maxIterations--;
      if (maxIterations === 0) {
        clearInterval(interval);
        this.sendMessage(
          AuthEvents.MEECO_VERIFY_VP_FAILED,
          {
            error: 'VP submission timeout',
            cid,
          }
        );
      }
    }, 3000)
  }

  async verifyVP(vpToken: string) {
    const verifiableCredential = this.meecoService.decodeVPToken(vpToken);
    if (new Date(verifiableCredential.vc.expirationDate).getTime() < Date.now()) {
      throw new Error('VP expired');
    }

    const { id: issuerId, name: issuerName } = verifiableCredential.vc.issuer;
    const issuerWhitelistRepository = new DataBaseHelper(MeecoIssuerWhitelist);
    const issuerWhitelist = await issuerWhitelistRepository.findOne({ issuerId, name: issuerName });
    if (!issuerWhitelist) {
      throw new Error(`Issuer ${issuerName} is not whitelisted`);
    }
  }

  async validateCredentials(vc: Vc): Promise<{success: boolean; message?: string}> {
    if (vc.expirationDate && this.isCredentialExpired(vc.expirationDate)) {
      return { success: false, message: 'Credentials expired' };
    }

    if (vc.credentialStatus) {
      return await this.meecoService.validateCredentials(vc);
    }

    return { success: true };
  }

  isCredentialExpired(expirationDate: string): boolean {
    const currentDate = new Date();
    const timestamp = Date.parse(expirationDate);
    if (isNaN(timestamp)) {
      throw new Error('Invalid expiration date from Meeco API credentials');
    }

    const expiresIn = new Date(expirationDate);
    return currentDate > expiresIn
  }

}
