import { Cryppo, IKey, IMasterEncryptionKey } from '../meeco/cryppo.js';
import { IMeecoConfig, MeecoApi } from './meeco-api.js';
import { IPassphraseArtefact } from './models/keys.js';
import { IMe } from '../meeco/models/me.js';
import { IPresentationRequest, IPresentationSubmission, IPresentationSubmissions } from './models/presentation-request.js';
import base64url from 'base64url';
import * as jwt from 'jsonwebtoken';
import { Vc, VerifiableCredential } from '@guardian/common';
import { StatusList } from '../helpers/credentials-validation/status-list.js';
import nacl from 'tweetnacl';

export class MeecoService {
  private readonly config: IMeecoConfig;
  private readonly meecoApi: any;
  private readonly cryppo: Cryppo;

  constructor(config: IMeecoConfig, passphraseBase32: string) {
    this.config = Object.freeze(config);
    this.meecoApi = new MeecoApi(config);
    this.cryppo = new Cryppo(passphraseBase32);
  }

  /**
   * getMe returns the Meeco user profile.
   * @returns {IMe} Meeco user profile
   */
  async getMe(): Promise<IMe> {
    return await this.meecoApi.getMe();
  }

  /**
   * getPassphraseArtefact fetch passphrase artefacts from meeco api
   * @returns {IPassphraseArtefact} passphrase artefacts
   */
  async getPassphraseArtefact(): Promise<IPassphraseArtefact> {
    return await this.meecoApi.getPassphraseArtefact();
  }

  /**
   * getMEK derives the Master Encryption Key from a passhrase using the provided artefacts.
   * @returns {IMasterEncryptionKey} MEK and artefacts
   */
  async getMEK(): Promise<IMasterEncryptionKey> {
    const r = await this.getPassphraseArtefact();

    const { passphrase_derivation_artefact: passphraseArtefacts } = r

    return await this.cryppo.deriveMEK(passphraseArtefacts.derivation_artefacts, passphraseArtefacts.verification_artefacts);
  }

  /**
   * getKEK fetches the Key Encryption Key from the Meeco API and decrypts it using the MEK.
   * @returns {IKey} Key Encryption Key
   */
  async getKEK(): Promise<IKey> {
    const mek = await this.getMEK();

    const serializedKEK = await this.meecoApi.getKeyEncryptionKey();

    return await this.cryppo.decryptKey(mek.key.key, serializedKEK.key_encryption_key.serialized_key_encryption_key)
  }

  /**
   * getDEK fetches the Data Encryption Key from the Meeco API and decrypts it using the KEK.
   * @returns {IKey} Data Encryption Key
   */
  async getDEK(): Promise<IKey> {
    const me = await this.getMe();
    const private_dek_external_id = me.user.private_dek_external_id;

    const kek = await this.getKEK();

    const serializedDEK = await this.meecoApi.getDataEncryptionKey(private_dek_external_id);

    return await this.cryppo.decryptKey(kek.key, serializedDEK.data_encryption_key.serialized_data_encryption_key);
  }

  /**
   * getKeyPair fetches the Key Pair from the Meeco API and decrypts it using the KEK.
   * @returns {IKey} Key Pair
   */
  async getKeyPair(): Promise<IKey> {
    const me = await this.getMe();
    const externalId = Buffer.from(me.user.did).toString('hex');

    const kek = await this.getKEK();

    const serializedKeyair = await this.meecoApi.getKeyPairs(externalId);

    return await this.cryppo.decryptKey(kek.key, serializedKeyair.keypair.encrypted_serialized_key);
  }

  /**
   * getSchema fetches the Schema from the Meeco API.
   * @param schemaId
   * @returns {any} Schema
   */
  async getSchema(schemaId: string): Promise<any> {
    const schema = await this.meecoApi.getSchema(schemaId);
    return schema;
  }

  /**
   * getSchemas fetches the Schemas from the Meeco API.
   * @returns {any} Schemas
   */
  async getSchemas(): Promise<any> {
    const schemas = await this.meecoApi.getSchemas();
    return schemas;
  }

  /**
   * createSchema creates a Schema on the Meeco API.
   * @param name
   * @param attributes
   * @returns {any} Schema
   */
  async createSchema(name: string, schemaStr: string): Promise<any> {
    const schemaData = JSON.parse(schemaStr);
    const schema = await this.meecoApi.createSchema(name, schemaData);
    return schema;
  }

  /**
   * createPresentationRequest creates a Presentation Request on the Meeco API.
   * @param requestName
   * @param clientDID
   * @param clientName
   * @param presentationDefinitionId
   * @returns {IPresentationRequest} Presentation Request with an unsigned JWT
   */
  async createPresentationRequest(requestName: string, clientDID: string, clientName: string, presentationDefinitionId: string): Promise<IPresentationRequest> {
    return await this.meecoApi.createPresentationRequest(requestName, clientDID, clientName, presentationDefinitionId);
  }

  /**
   * signPresentationRequestToken signs the unsigned JWT from the Presentation Request and submits the signed JWT.
   * @param request_id
   * @param unsigned_request_jwt
   * @returns {IPresentationRequest} Presentation Request with a signed JWT
   */
  async signPresentationRequestToken(requestId: string, unsignedRequestJwt: string): Promise<IPresentationRequest> {
    const kp = await this.getKeyPair();
    const keyPair = nacl.sign.keyPair.fromSeed(kp.key.bytes);

    const signature = nacl.sign.detached(Buffer.from(unsignedRequestJwt), keyPair.secretKey)
    const signatureBase64 = base64url.encode(signature as any);

    const signedRequest = `${unsignedRequestJwt}.${signatureBase64}`;

    return await this.meecoApi.submitPresentationRequestSignature(requestId, signedRequest);
  }

  /**
   * getVPSubmissions fetches the Verifiable Presentation Submissions from the Meeco API.
   * @param requestId
   * @returns {IPresentationSubmissions} Verifiable Presentation Submissions
   */
  async getVPSubmissions(requestId: string): Promise<IPresentationSubmissions> {
    return await this.meecoApi.getVPSubmissions(requestId);
  }

  /**
   * verifyVP verifies the Verifiable Presentation.
   * @param idToken
   * @param request_uri
   * @param vpToken
   * @returns {boolean} true if verified
   */
  async verifyVP(idToken: string, requestId: string, vpToken: string): Promise<boolean> {
    return await this.meecoApi.verifyVP(idToken, requestId, vpToken);
  }

  /**
   * approveVPSubmission approves the Verifiable Presentation Submission.
   * @param requestId
   * @param submissionId
   * @param verified
   * @returns {IPresentationSubmission} Verifiable Presentation Submission
   */
  async approveVPSubmission(requestId: string, submissionId: string, verified: boolean): Promise<IPresentationSubmission> {
    return await this.meecoApi.approveVPSubmission(requestId, submissionId, verified);
  }

  /**
   * getVPSubmissionRedirectUri returns the redirect URI for the Verifiable Presentation Submission.
   * @param requestId
   * @returns {string} redirect URI
   */
  async getVPSubmissionRedirectUri(requestId: string): Promise<string> {
    return `openid-vc://?request_uri=${this.config.baseUrl}/oidc/presentations/requests/${requestId}/jwt`;
  }

  decodeVPToken(vpToken: string): VerifiableCredential {
    const decodedVPToken: any = jwt.decode(vpToken);
    const verifiableCredentialJWT = decodedVPToken.vp.verifiableCredential[0];
    return jwt.decode(verifiableCredentialJWT) as VerifiableCredential;
  }

  /**
   * validateVC validates the Verifiable Credential.
   * @param vc
   * @see https://learn.mattr.global/tutorials/revocation/web-credentials/view-revocation-list
   */
  async validateCredentials(vc: Vc): Promise<{message: string, success: boolean}> {
    const decodedVPToken = await this.meecoApi.getVCStatusList(vc.credentialStatus.statusListCredential)
    if (!decodedVPToken.vc?.credentialSubject?.encodedList) {
      return { message: 'No encoded list in the credential subject', success: false };
    }
    const statusListDecoder = await StatusList.decode({
      encodedList: decodedVPToken.vc.credentialSubject.encodedList
    });
    if (!statusListDecoder.getStatus(vc.credentialStatus.statusListIndex)) {
      return { message: 'The credential used in the Meeco Wallet has been revoked', success: false };
    }

    return { message: 'Valid credentials', success: true };
  }
}
