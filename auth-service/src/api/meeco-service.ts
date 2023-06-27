import { MessageResponse, NatsService, Singleton } from '@guardian/common';
import { AuthEvents, GenerateUUIDv4, IUser } from '@guardian/interfaces';
import { MeecoService } from '../meeco/meeco.service';
import { Logger } from '@nestjs/common';

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
    this.meecoService = new MeecoService(MeecoConfig, MeecoPassphrase);
  }

  /**
   * Register listeners
   */
  registerListeners(): void {
    /**
     * Subscribe to MEECO_AUTH_START event
     * Request a new VP presentation request from Meeco and return the redirect URI
     */
    this.getMessages<any, IUser[]>(AuthEvents.MEECO_AUTH_START, async (msg) => {
      // generate a random UUID as the request name
      const requestName = GenerateUUIDv4();

      // ToDo: get ClientDID from getMe API
      const clientDID = 'did:web:did-web.securevalue.exchange:343b08f3-dc4d-4cd3-b276-3f2d8a146a0d';
      // ToDO: get ClientName from Configurations
      const clientName = 'ieu';
      // ToDo: get PresentationDefinitionId from Configurations or the process to generate new Schema
      const presentationDefinitionId = '832e996c-fdba-447f-8989-9d170fa381a8';

      try {
        const vpRequest = await this.meecoService.createPresentationRequest(
          requestName,
          clientDID,
          clientName,
          presentationDefinitionId,
        );

        const signVPRequest = await this.meecoService.signPresentationRequestToken(vpRequest.presentation_request.id, vpRequest.presentation_request.tokens.unsigned_request_jwt);
        const redirectUri = this.meecoService.getVPSubmissionRedirectUri(signVPRequest.presentation_request.id);

        return new MessageResponse({redirectUri, cid: msg.cid});
      } catch(ex) {
        this.logger.error(ex.message, ex.stack);
        return new MessageResponse({error: ex.message, cid: msg.cid});
      }
    });

  }

}