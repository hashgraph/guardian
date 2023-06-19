import axios from 'axios';
import querystring from 'querystring';
import { IMe } from './models/me';
import { IDEK, IKEK, IKeypair, IPassphraseArtefact } from './models/keys';
import { IPresentationRequest, IPresentationSubmissions } from './models/presentation_request';

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

  /**
   * Get the Meeco user's keypair.
   * @returns {IKeypair} keypair
   */
  async getKeyPairs(externalId: string): Promise<IKeypair> {
    const access_token = await this.getTokenOauth2();

    const url = `${this.config.baseUrl}/keypairs/external_id/${externalId}`;
    const headers = {
      headers: {
        'Authorization': access_token,
        'Meeco-Organisation-Id': this.config.meecoOrganizationId,
      }
    }

    const result = await axios.get(url, headers);
    const { data: keypair } = result;

    return keypair;
  }

  /**
   * Get the Meeco user's passphrase artefact.
   * @returns {IPassphraseArtefact} passphrase artefact
   */
  async getPassphraseArtefact(): Promise<IPassphraseArtefact> {
    const access_token = await this.getTokenOauth2();

    const url = `${this.config.baseUrl}/passphrase_derivation_artefact`;
    const headers = {
      headers: {
        'Authorization': access_token,
        'Meeco-Organisation-Id': this.config.meecoOrganizationId,
      }
    }

    const result = await axios.get(url, headers);    
    const { data: passphrase_derivation_artefact } = result.data;

    return passphrase_derivation_artefact;
  }

  /**
   * Create a new Verifiable Pesentation Request that expires in a short time
   * @param requestName
   * @param client_did
   * @param clientName
   * @param presentation_definition_id
   * @returns {IPresentationRequest} presentation request
   */
  async createPresentationRequest(requestName: string, client_did: string, clientName: string, presentation_definition_id: string): Promise<IPresentationRequest> {
    const access_token = await this.getTokenOauth2();

    const expires_at = new Date();
    expires_at.setDate(expires_at.getMinutes() + 5);

    const request = {
      presentation_request: {
        name: requestName,
        client_id: client_did,
        client_name: clientName,
        expires_at:  expires_at.toISOString(),
        redirect_base_uri: `${this.config.baseUrl}`,
        presentation_definition_id: presentation_definition_id,
        method: "qrcode"
      }
    }

    const url = `${this.config.baseUrl}/oidc/presentations/requests`;
    var headers = {
      headers: {
        'Authorization': access_token,
        'Meeco-Organisation-Id': this.config.meecoOrganizationId,
        'Content-Type': 'application/json'
      },
    };
    const data = JSON.stringify(request)

    const result = await axios.post(url, data, headers);
    const { data: presentationRequest } = result;

    return presentationRequest;
  }

  /**
   * Submit signature of token signed by private key to the VP Request 
   * @param request_id 
   * @param signed_request 
   * @returns 
   */
  async submitPresentationRequestSignature(request_id: string, signed_request: string): Promise<IPresentationRequest> {
    const access_token = await this.getTokenOauth2();
    
    const request = {
      presentation_request: {
        signed_request_jwt: signed_request
      }
    }

    const url = `${this.config.baseUrl}/oidc/presentations/requests/${request_id}`;
    var headers = {
      headers: {
        'Authorization': access_token,
        'Meeco-Organisation-Id': this.config.meecoOrganizationId,
        'Content-Type': 'application/json'
      },
    };
    const data = JSON.stringify(request)

    const result = await axios.patch(url, data, headers);
    const { data: presentationRequest } = result;

    return presentationRequest;
  }

  /**
   * Get user's Submissions to the Verifiable Presentation Request
   * @param request_id
   */
  async getVPSubmissions(requestId: string): Promise<IPresentationSubmissions> {
    const access_token = await this.getTokenOauth2();

    const url = `${this.config.baseUrl}/oidc/presentations/requests/${requestId}/submissions`;
    var headers = {
      headers: {
        'Authorization': access_token,
        'Meeco-Organisation-Id': this.config.meecoOrganizationId,
        'Content-Type': 'application/json'
      }
    };

    const result = await axios.get(url, headers);
    const { data: submissions } = result;

    return submissions;
  }

  async verifyVP(id_token: string, request_uri: string, vp_token: string): Promise<boolean> {
    const access_token = await this.getTokenOauth2();

    const request = {
      presentation_request_response: {
        id_token,
        request_uri,
        vp_token,
      }
    }

    const url = `${this.config.baseUrl}/oidc/presentations/response/verify`;
    var headers = {
      headers: {
        'Authorization': access_token,
        'Meeco-Organisation-Id': this.config.meecoOrganizationId,
        'Content-Type': 'application/json'
      },
    };
    const data = JSON.stringify(request)

    const result = await axios.post(url, data, headers);

    return true ? result.status === 204 : false;
  }
}