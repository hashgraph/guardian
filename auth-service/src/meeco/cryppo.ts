import { bytesToBinaryString, decodeDerivationArtifacts, decryptWithKey, DerivedKeyOptions, EncryptionKey, generateDerivedKey, IDerivedKey, KeyDerivationStrategy } from '@meeco/cryppo'
import baseX from 'base-x';

const base32Alphabet = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

export interface IMasterEncryptionKey {
  key: {
    key: EncryptionKey;
    options: DerivedKeyOptions;
  },
  derivationArtifacts: string,
  verificationArtifacts: string,
}

export interface IKey {
  key: EncryptionKey,
  serializedKey: string,
}

export class Cryppo {
  private readonly passphrase: string;

  constructor(passphraseBase32: string) {
    this.passphrase = this.decodeBase32(passphraseBase32);
  }

  /**
   * Derive Mater Encryption key from a passhrase using the provided artefacts.
   * @param derivationArtifacts IDerivedKey
   * @param verificationArtifacts IDerivedKey
   * @returns {IMasterEncryptionKey} MEK and artefacts
   */
  async deriveMEK(derivationArtifacts: string, verificationArtifacts: string): Promise<IMasterEncryptionKey> {
    if (
      (derivationArtifacts && !verificationArtifacts) ||
      (verificationArtifacts && !derivationArtifacts)
    ) {
      throw new Error('both artefacts params must be provided');
    }

    const derivedKeyOpts = DerivedKeyOptions.fromSerialized(derivationArtifacts)

    const key2 = await generateDerivedKey({
      passphrase: this.passphrase,
      ...this.iDerivedKeyToParams(derivedKeyOpts),
    });

    const { token: token2, encrypted } = decodeDerivationArtifacts(verificationArtifacts);

    const verificationArtifactsDecryptedBytes = await this.decryptBinary(key2.key, encrypted) as Uint8Array;
    const verificationArtifactsDecrypted = bytesToBinaryString(
      verificationArtifactsDecryptedBytes
    );
    const decodedToken = verificationArtifactsDecrypted.split('.')[0];

    if (token2 !== decodedToken) {
      throw new Error('MEK verification failed');
    }

    return {
      key: key2,
      derivationArtifacts: key2.options.serialize(),
      verificationArtifacts,
    };
  }

  /**
   * Decrypt a key with the MEK.
   * @param key encryption key
   * @param data encrypted key
   * @returns {IKey} decrypted key and serialized key
   */
  async decryptKey(key: EncryptionKey, data: string): Promise<IKey> {
    const bytes = await this.decryptBinary(key, data);

    return {
      key: EncryptionKey.fromBytes(bytes as Uint8Array),
      serializedKey: data,
    };
  }

  /**
   * Convert IDerivedKey to params for generateDerivedKey.
   * @param derivationArtifacts IDerivedKey
   * @returns params for generateDerivedKey
   */
  iDerivedKeyToParams(derivationArtifacts?: Partial<IDerivedKey>) {
    return {
      iterationVariance: 0,
      minIterations: derivationArtifacts?.iterations || 10000,
      length: derivationArtifacts?.length || 32,
      strategy: derivationArtifacts?.strategy || KeyDerivationStrategy.Pbkdf2Hmac,
      useSalt: derivationArtifacts?.salt || '',
      hash: derivationArtifacts?.hash || 'SHA256',
    };
  }

  /**
   * Decrypt a binary string with a key.
   * @param key encryption key
   * @param data binary string
   * @returns decrypted binary string
   */
  decryptBinary(key: EncryptionKey, data: string) {
    return decryptWithKey({
      serialized: data,
      key,
    });
  }

  /**
   * Decode a base32 string into a binary string.
   * @param val base32 encoded string
   * @returns binary string
   */
  decodeBase32 = (val: string) => {
    const decoded = baseX(base32Alphabet).decode(`${val}`.trim().replace(/-/g, ''));
    return bytesToBinaryString(decoded);
  };
}
