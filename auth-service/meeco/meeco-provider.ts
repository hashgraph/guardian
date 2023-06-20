import { Cryppo, IKey, IMasterEncryptionKey } from "./cryppo";
import { IMeecoConfig, MeecoApi } from "./meeco-api";
import { IPassphraseArtefact } from "./models/keys";
import { IMe } from "./models/me";

/**
 * MeecoProvider is a wrapper around the Meeco API and Cryppo.
 * It provides a single interface for the auth-service to interact with Meeco.
 */
export class MeecoProvider {
  private meecoApi: MeecoApi;
  private cryppo: Cryppo;

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
    const passphrase_derivation_artefact = await this.meecoApi.getPassphraseArtefact();
    return passphrase_derivation_artefact;
  }

  /**
   * getMEK derives the Master Encryption Key from a passhrase using the provided artefacts.
   * @returns {IMasterEncryptionKey} MEK and artefacts
   */
  async getMEK(): Promise<IMasterEncryptionKey> {
    const { passphrase_derivation_artefact: passphraseArtefacts } = await this.getPassphraseArtefact();

    const mek = await this.cryppo.deriveMEK(passphraseArtefacts.derivation_artefacts, passphraseArtefacts.verification_artefacts);
    
    return mek;
  }

  /**
   * getKEK fetches the Key Encryption Key from the Meeco API and decrypts it using the MEK.
   * @returns {IKey} Key Encryption Key
   */
  async getKEK(): Promise<IKey> {
    const mek = await this.getMEK();

    const serialized_kek = await this.meecoApi.getKeyEncryptionKey();

    const kek = await this.cryppo.decryptKey(mek.key.key, serialized_kek.key_encryption_key.serialized_key_encryption_key)
    
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

    const serialized_dek = await this.meecoApi.getDataEncryptionKey(private_dek_external_id);

    const dek = await this.cryppo.decryptKey(kek.key, serialized_dek.data_encryption_key.serialized_data_encryption_key);

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

    const serialized_keyair = await this.meecoApi.getKeyPairs(externalId);

    const kp = await this.cryppo.decryptKey(kek.key, serialized_keyair.keypair.encrypted_serialized_key);
    
    return kp;
  }
}