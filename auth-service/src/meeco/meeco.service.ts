import { Injectable } from '@nestjs/common';
import { Cryppo, IKey, IMasterEncryptionKey } from '../meeco/cryppo';
import { IMeecoConfig, MeecoApi } from './meeco-api';
import { IPassphraseArtefact } from './models/keys';
import { IMe } from '../meeco/models/me';
import { IPresentationRequest, IPresentationSubmission, IPresentationSubmissions } from './models/presentation-request';
import base64url from 'base64url';
import * as jwt from 'jsonwebtoken';

const nacl = require('tweetnacl');

@Injectable()
export class MeecoService {
  private readonly meecoApi: MeecoApi;
  private readonly cryppo: Cryppo;

  constructor(config: IMeecoConfig, passphraseBase32: string) {
    this.meecoApi = new MeecoApi(config);
    this.cryppo = new Cryppo(passphraseBase32);
  }

  /**
   * getMe returns the Meeco user profile.
   * @returns {IMe} Meeco user profile
   */
  async getMe(): Promise<IMe> {
    const me = await this.meecoApi.getMe();
    return me;
  }

  /**
   * getPassphraseArtefact fetch passphrase artefacts from meeco api
   * @returns {IPassphraseArtefact} passphrase artefacts
   */
  async getPassphraseArtefact(): Promise<IPassphraseArtefact> {
    const passphraseDerivationArtefact = await this.meecoApi.getPassphraseArtefact();
    return passphraseDerivationArtefact;
  }

  /**
   * getMEK derives the Master Encryption Key from a passhrase using the provided artefacts.
   * @returns {IMasterEncryptionKey} MEK and artefacts
   */
  async getMEK(): Promise<IMasterEncryptionKey> {
    const r = await this.getPassphraseArtefact();

    const { passphrase_derivation_artefact: passphraseArtefacts } = r

    const mek = await this.cryppo.deriveMEK(passphraseArtefacts.derivation_artefacts, passphraseArtefacts.verification_artefacts);

    return mek;
  }

  /**
   * getKEK fetches the Key Encryption Key from the Meeco API and decrypts it using the MEK.
   * @returns {IKey} Key Encryption Key
   */
  async getKEK(): Promise<IKey> {
    const mek = await this.getMEK();

    const serializedKEK = await this.meecoApi.getKeyEncryptionKey();

    const kek = await this.cryppo.decryptKey(mek.key.key, serializedKEK.key_encryption_key.serialized_key_encryption_key)

    return kek;
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

    const dek = await this.cryppo.decryptKey(kek.key, serializedDEK.data_encryption_key.serialized_data_encryption_key);

    return dek;
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

    const kp = await this.cryppo.decryptKey(kek.key, serializedKeyair.keypair.encrypted_serialized_key);

    return kp;
  }

  /**
   * createPresentationRequest creates a Presentation Request on the Meeco API.
   * @param requestName
   * @param clien_did
   * @param clientName
   * @param presentationDefinitionId
   * @returns {IPresentationRequest} Presentation Request with an unsigned JWT
   */
  async createPresentationRequest(requestName: string, clientDID: string, clientName: string, presentationDefinitionId: string): Promise<IPresentationRequest> {
    const presentationRequest = await this.meecoApi.createPresentationRequest(requestName, clientDID, clientName, presentationDefinitionId);
    return presentationRequest;
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
    const signatureBase64 = base64url.encode(signature);

    const signedRequest = `${unsignedRequestJwt}.${signatureBase64}`;

    const presentationRequest = await this.meecoApi.submitPresentationRequestSignature(requestId, signedRequest);
    return presentationRequest;
  }

  /**
   * getVPSubmissions fetches the Verifiable Presentation Submissions from the Meeco API.
   * @param requestId
   * @returns {IPresentationSubmissions} Verifiable Presentation Submissions
   */
  async getVPSubmissions(requestId: string): Promise<IPresentationSubmissions> {
    const submissions = await this.meecoApi.getVPSubmissions(requestId);
    return submissions;
  }

  /**
   * verifyVP verifies the Verifiable Presentation.
   * @param idToken
   * @param request_uri
   * @param vpToken
   * @returns {boolean} true if verified
   */
  async verifyVP(idToken: string, requestId: string, vpToken: string): Promise<boolean> {
    const verified = await this.meecoApi.verifyVP(idToken, requestId, vpToken);
    return verified;
  }

  /**
   * approveVPSubmission approves the Verifiable Presentation Submission.
   * @param requestId
   * @param submissionId
   * @param verified
   * @returns {IPresentationSubmission} Verifiable Presentation Submission
   */
  async approveVPSubmission(requestId: string, submissionId: string, verified: boolean): Promise<IPresentationSubmission> {
    const verifiedSubmission = await this.meecoApi.approveVPSubmission(requestId, submissionId, verified);
    return verifiedSubmission;
  }

  decodeVPToken(vpToken: string): any {
    const decodedVPToken: any = jwt.decode(vpToken);
    const verifiableCredentialJWT = decodedVPToken.vp.verifiableCredential[0];
    const verifiableCredential: any = jwt.decode(verifiableCredentialJWT);
    return verifiableCredential;
  }
}
