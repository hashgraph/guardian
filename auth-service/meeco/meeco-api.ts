import axios from 'axios';
import querystring from 'querystring';
import { IMe } from './models/me';
import { IDEK, IKEK, IKeypair } from './models/keys';

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


  /**
   * Get the Meeco user profile.
   */
  async getMe(): Promise<IMe> {
    const access_token = await this.getTokenOauth2();

    const url = `${this.config.baseUrl}/me`;
    const headers = {
      headers: { 
        'Authorization': access_token, 
        'Meeco-Organisation-Id': this.config.meecoOrganizationId, 
      }
    }

    const result = await axios.get(url, headers);
    
    const { data: me } = result;

    return me;
  }

  /**
   * Get the Meeco user's key encryption key.
   * @returns {IKEK} key encryption key
   */
  async getKeyEncryptionKey(): Promise<IKEK> {
    const access_token = await this.getTokenOauth2();

    const url = `${this.config.baseUrl}/key_encryption_key`;
    const headers = {
      headers: { 
        'Authorization': access_token, 
        'Meeco-Organisation-Id': this.config.meecoOrganizationId,
      }
    }

    const result = await axios.get(url, headers);
    const { data: kek } = result;

    return kek;
  }

  /**
   * Get the Meeco user's data encryption key.
   * @returns {IDEK} Data Encryption Key
   */
  async getDataEncryptionKey(private_dek_external_id: string): Promise<IDEK> {
    const access_token = await this.getTokenOauth2();

    const url = `${this.config.baseUrl}/data_encryption_keys/${private_dek_external_id}`;
    const headers = {
      headers: {
        'Authorization': access_token,
        'Meeco-Organisation-Id': this.config.meecoOrganizationId,
      }
    }

    const result = await axios.get(url, headers);
    const { data: dek } = result;

    return dek;
  }
}