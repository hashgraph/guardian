import axios from 'axios';
import querystring from 'querystring';

export interface IMeecoOauthConfig {
  url: string;
  clientId: string;
  clientSecret: string;
  scope: string;
  grantType: string;
}

export interface IMeecoConfig {
  baseUrl: string;
  oauth: IMeecoOauthConfig;  
  meecoOrganizationId: string;
}

/**
 * MeecoApi is a wrapper around the Meeco API.
 */
export class MeecoApi {
  private config: IMeecoConfig;

  constructor(config: IMeecoConfig) {
    this.config = Object.freeze(config);
  }

  /**
   * Authneticate with Meeco API via OAUTH2.0 and return an access token.
   * @returns {string} access token
   */
  async getTokenOauth2(): Promise<string> {
    const oauthData = {
      grant_type: this.config.oauth.grantType,
      client_id: this.config.oauth.clientId,
      client_secret: this.config.oauth.clientSecret,
      scope: this.config.oauth.scope,
    };

    const url = this.config.oauth.url;
    const data = querystring.stringify(oauthData);
    const headers = { 
      headers: {
        'content-type': 'application/x-www-form-urlencoded' 
      }     
    };

    const result = await axios.post(url, data, headers);
    const { token_type, access_token } = result.data;
    return `${token_type} ${access_token}`;
  }
}