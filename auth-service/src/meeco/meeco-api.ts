import axios from 'axios';
import querystring from 'node:querystring';
import { IMe } from '../meeco/models/me.js';
import { IDEK, IKEK, IKeypair, IPassphraseArtefact } from '../meeco/models/keys.js';
import { IPresentationRequest, IPresentationSubmission, IPresentationSubmissions } from './models/presentation-request.js';
import { IMeecoSchemaData } from './models/schema.js';
import * as jwt from 'jsonwebtoken';
import { VerifiableCredentialStatusListResult } from '@guardian/common';

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
  private readonly config: IMeecoConfig;

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
        'content-type': 'application/x-www-form-urlencoded',
      },
    };

    const result = await axios.post(url, data, headers);
    const { token_type, access_token: accessToken } = result.data;
    return `${token_type} ${accessToken}`;
  }

  /**
   * Get the Meeco user profile.
   */
  async getMe(): Promise<IMe> {
    const accessToken = await this.getTokenOauth2();

    const url = `${this.config.baseUrl}/me`;
    const headers = {
      headers: {
        'Authorization': accessToken,
        'Meeco-Organisation-Id': this.config.meecoOrganizationId,
      },
    };

    const result = await axios.get(url, headers);

    const { data: me } = result;

    return me;
  }

  /**
   * Get the Meeco user's key encryption key.
   * @returns {IKEK} key encryption key
   */
  async getKeyEncryptionKey(): Promise<IKEK> {
    const accessToken = await this.getTokenOauth2();

    const url = `${this.config.baseUrl}/key_encryption_key`;
    const headers = {
      headers: {
        'Authorization': accessToken,
        'Meeco-Organisation-Id': this.config.meecoOrganizationId,
      },
    };

    const result = await axios.get(url, headers);
    const { data: kek } = result;

    return kek;
  }

  /**
   * Get the Meeco user's keypair.
   * @param schemaId
   * @returns {Schema} schema
   */
  async getSchema(schemaId: string): Promise<any> {
    const accessToken = await this.getTokenOauth2();

    const url = `${this.config.baseUrl}/schemas/${schemaId}`;

    const headers = {
      headers: {
        'Authorization': accessToken,
        'Meeco-Organisation-Id': this.config.meecoOrganizationId,
      },
    };

    const result = await axios.get(url, headers);

    const { data: schema } = result;

    return schema;
  }

  /**
   * Get the Meeco user's keypair.
   * @returns {Schemas}
   */
  async getSchemas(): Promise<any> {
    const accessToken = await this.getTokenOauth2();

    const url = `${this.config.baseUrl}/schemas`;

    const headers = {
      headers: {
        'Authorization': accessToken,
        'Meeco-Organisation-Id': this.config.meecoOrganizationId,
      },
    };

    const result = await axios.get(url, headers);

    const { data: schemas } = result;

    return schemas;
  }

  /**
   * Create a new Schema
   * @param name
   * @param schema
   * @returns {any} new schema
   */
  async createSchema(name: string, schema: IMeecoSchemaData): Promise<any> {
    const accessToken = await this.getTokenOauth2();

    const url = `${this.config.baseUrl}/schemas`;

    const meecoSchema = {
      schema: {
        name,
        schema_json: schema,
        organization_ids: [this.config.meecoOrganizationId],
      }
    }
    const data = JSON.stringify(meecoSchema);

    const headers = {
      headers: {
        'Authorization': accessToken,
        'Meeco-Organisation-Id': this.config.meecoOrganizationId,
      },
    };

    const result = await axios.post(url, data, headers);

    const { data: newSchema } = result;

    return newSchema;
  }

  /**
   * Get the Meeco user's data encryption key.
   * @returns {IDEK} Data Encryption Key
   */
  async getDataEncryptionKey(privateDekExternalId: string): Promise<IDEK> {
    const accessToken = await this.getTokenOauth2();

    const url = `${this.config.baseUrl}/data_encryption_keys/${privateDekExternalId}`;
    const headers = {
      headers: {
        'Authorization': accessToken,
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
    const accessToken = await this.getTokenOauth2();

    const url = `${this.config.baseUrl}/keypairs/external_id/${externalId}`;
    const headers = {
      headers: {
        'Authorization': accessToken,
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
    const accessToken = await this.getTokenOauth2();

    const url = `${this.config.baseUrl}/passphrase_derivation_artefact`;
    const headers = {
      headers: {
        'Authorization': accessToken,
        'Meeco-Organisation-Id': this.config.meecoOrganizationId,
      }
    }

    const result = await axios.get(url, headers);

    const { data: passphraseDerivationArtefact } = result;

    return passphraseDerivationArtefact;
  }

  /**
   * Create a new Verifiable Pesentation Request that expires in a short time
   * @param requestName
   * @param clientDID
   * @param clientName
   * @param presentationDefinitionId
   * @returns {IPresentationRequest} presentation request
   */
  async createPresentationRequest(requestName: string, clientDID: string, clientName: string, presentationDefinitionId: string): Promise<IPresentationRequest> {
    const accessToken = await this.getTokenOauth2();

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 5);

    const request = {
      presentation_request: {
        name: requestName,
        client_id: clientDID,
        client_name: clientName,
        expires_at:  expiresAt.toISOString(),
        redirect_base_uri: `${this.config.baseUrl}`,
        presentation_definition_id: presentationDefinitionId,
        method: 'qrcode',
      }
    }

    const url = `${this.config.baseUrl}/oidc/presentations/requests`;
    const headers = {
      headers: {
        'Authorization': accessToken,
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
   * @param requestId
   * @param signed_request
   * @returns
   */
  async submitPresentationRequestSignature(requestId: string, signedRequest: string): Promise<IPresentationRequest> {
    const accessToken = await this.getTokenOauth2();

    const request = {
      presentation_request: {
        signed_request_jwt: signedRequest
      }
    }

    const url = `${this.config.baseUrl}/oidc/presentations/requests/${requestId}`;
    const headers = {
      headers: {
        'Authorization': accessToken,
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
    const accessToken = await this.getTokenOauth2();

    const url = `${this.config.baseUrl}/oidc/presentations/requests/${requestId}/submissions`;
    const headers = {
      headers: {
        'Authorization': accessToken,
        'Meeco-Organisation-Id': this.config.meecoOrganizationId,
        'Content-Type': 'application/json'
      }
    };

    const result = await axios.get(url, headers);
    const { data: submissions } = result;

    return submissions;
  }

  async verifyVP(idToken: string, requestId: string, vpToken: string): Promise<boolean> {
    const accessToken = await this.getTokenOauth2();

    const requestUri = `${this.config.baseUrl}/oidc/presentations/requests/${requestId}/jwt`

    const request = {
      presentation_request_response: {
        id_token: idToken,
        vp_token: vpToken,
        request_uri: requestUri,
      }
    }

    const url = `${this.config.baseUrl}/oidc/presentations/response/verify`;
    const headers = {
      headers: {
        'Authorization': accessToken,
        'Meeco-Organisation-Id': this.config.meecoOrganizationId,
        'Content-Type': 'application/json'
      },
    };
    const data = JSON.stringify(request)

    try {
      const result = await axios.post(url, data, headers);
      return `${result.status}`.startsWith('20');
    } catch(ex) {
      throw new Error(ex.response.data.errors[0].extra_info.reason);
    }
  }

  async approveVPSubmission(requestId: string, submissionId: string, verified: boolean): Promise<IPresentationSubmission> {
    const accessToken = await this.getTokenOauth2();

    const request = {
      submission: {
        status: verified ? 'verified' : 'rejected'
      }
    }

    const url = `${this.config.baseUrl}/oidc/presentations/requests/${requestId}/submissions/${submissionId}`;
    const headers = {
      headers: {
        'Authorization': accessToken,
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
   * Get the status list from the Verifiable Credential
   * @param statusListCredentialUrl
   * @returns Promise<VerifiableCredentialStatusListResult>
   */
  async getVCStatusList(statusListCredentialUrl: string): Promise<VerifiableCredentialStatusListResult> {
    const { data } = await axios.get(statusListCredentialUrl)
    return jwt.decode(data) as VerifiableCredentialStatusListResult;
  }
}
