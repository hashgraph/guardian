import jwt from 'jsonwebtoken';
import { checkRsaKey, checkRsaKeyPair } from './jwt-key-check.js';

export class JwtServicesValidator {
  private static serviceName: string = '';

  public static setServiceName(name) {
    JwtServicesValidator.serviceName = name;
  }

  private static getSecretKeyName() {
    return process.env.SERVICE_JWT_SECRET_KEY?.length > 8
      ? 'SERVICE_JWT_SECRET_KEY'
      : 'SERVICE_JWT_SECRET_KEY_ALL';
  }

  private static getPublicKeyNameByServiceName(serviceName = 'ALL') {
    return process.env[`SERVICE_JWT_PUBLIC_KEY_${serviceName}`]?.length > 8
      ? `SERVICE_JWT_PUBLIC_KEY_${serviceName}`
      : 'SERVICE_JWT_PUBLIC_KEY_ALL';
  }

  private static getSecretKey() {
    return process.env[JwtServicesValidator.getSecretKeyName()];
  }

  private static getPublicKeyByServiceName(serviceName = 'ALL') {
    return process.env[JwtServicesValidator.getPublicKeyNameByServiceName(serviceName)];
  }

  /**
   * Check the service keys this process signs and verifies with
   * @returns Human-readable problems; empty when the keys are usable
   */
  public static checkKeys(): string[] {
    if (process.env.QM_VERIFICATION === 'false') {
      return [];
    }

    const errors: string[] = [];
    const secretName = JwtServicesValidator.getSecretKeyName();
    const ownPublicName = JwtServicesValidator.getPublicKeyNameByServiceName(JwtServicesValidator.serviceName);
    const ownPublicKey = process.env[ownPublicName];
    const secretError = ownPublicKey?.length > 8
      ? checkRsaKeyPair(ownPublicKey, process.env[secretName], ownPublicName, secretName)
      : checkRsaKey(process.env[secretName], secretName, 'private');
    if (secretError) {
      errors.push(secretError);
    }

    for (const [name, value] of Object.entries(process.env)) {
      if (name.startsWith('SERVICE_JWT_PUBLIC_KEY_') && name !== ownPublicName && value?.length > 8) {
        const publicError = checkRsaKey(value, name, 'public');
        if (publicError) {
          errors.push(publicError);
        }
      }
    }

    return errors;
  }

  public static async sign(subject = ''): Promise<string> {
    if (process.env.QM_VERIFICATION === 'false') {
      return '';
    }

    const key = JwtServicesValidator.getSecretKey();

    if (key?.length < 8) {
      throw new Error(`No privateKey for ${JwtServicesValidator.serviceName}`);
    }

    return jwt.sign(
      { serviceName: JwtServicesValidator.serviceName, subject },
      key,
      { algorithm: 'RS256' }
    );
  }

  public static async verify(token: string): Promise<string> {
    if (process.env.QM_VERIFICATION === 'false') {
      return '';
    }

    const decoded = jwt.decode(token) as any;
    const serviceName = decoded?.serviceName || 'ALL';
    const publicKey = JwtServicesValidator.getPublicKeyByServiceName(serviceName);

    if (publicKey?.length < 8) {
      throw new Error(`No publicKey for ${serviceName}`);
    }

    try {
      const payload = jwt.verify(token, publicKey, { algorithms: ['RS256'] }) as Record<string, string>;

      if (payload.serviceName !== serviceName) {
        throw new Error('ServiceName mismatch');
      }

      return serviceName;
    } catch (error) {
      console.log(error, 'error');
      throw new Error('Service validator: invalid or expired token');
    }
  }
}
