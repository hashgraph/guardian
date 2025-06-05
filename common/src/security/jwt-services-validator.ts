import jwt from 'jsonwebtoken';
import { SecretManagerBase } from '../secret-manager/index.js';

export class JwtServicesValidator {
  private static privateKey: string | null = null;
  private static whiteList: string[] = [];
  private static startsWithWhiteList: string[] = [];
  private static serviceName: string = '';
  private static secretManager: SecretManagerBase | null = null;

  public static setWhiteList(whiteList, startsWithWhiteList = []) {
    JwtServicesValidator.whiteList = whiteList;
    JwtServicesValidator.startsWithWhiteList = startsWithWhiteList;
  }

  public static setServiceName(name) {
    JwtServicesValidator.serviceName = name;
  }

  public static setSecretManager(secretManager) {
    JwtServicesValidator.secretManager = secretManager;
  }

  private static getServiceName(): string {
    return JwtServicesValidator.serviceName || process.env.SERVICE_CHANNEL;
  }

  private static getSecreManager(secretManager: SecretManagerBase): SecretManagerBase {
    return secretManager || JwtServicesValidator.secretManager;
  }

  private static async loadPrivateKey(secretManager): Promise<string> {
    if (!JwtServicesValidator.privateKey) {
      const serviceName = JwtServicesValidator.getServiceName();
      const secrets = await JwtServicesValidator.getSecreManager(secretManager).getSecrets(`secretkey/jwt-service/${serviceName}`);

      if (!secrets?.SERVICE_JWT_SECRET_KEY) {
        throw new Error(`No privateKey for ${serviceName}`);
      }

      JwtServicesValidator.privateKey = secrets.SERVICE_JWT_SECRET_KEY;
    }
    return JwtServicesValidator.privateKey;
  }

  public static async sign(subject = '', secretManager = null): Promise<string> {
    if (!JwtServicesValidator.getSecreManager(secretManager) || JwtServicesValidator.whiteList.includes(subject)) {
      return '';
    }

    const key = await JwtServicesValidator.loadPrivateKey(secretManager);

    return jwt.sign(
      { serviceName: JwtServicesValidator.getServiceName(), subject },
      key,
      { algorithm: 'RS256' }
    );
  }

  public static async verify(token: string, subject = '', secretManager = null): Promise<string> {
    if (!token && (JwtServicesValidator.whiteList.includes(subject) || JwtServicesValidator.startsWithWhiteList.some(str => subject.startsWith(str)))) {
      return '';
    }

    const decoded = jwt.decode(token) as any;
    const serviceName  = decoded?.serviceName;

    if (!serviceName) {
      throw new Error('Missing serviceName');
    }

    const secrets = await JwtServicesValidator.getSecreManager(secretManager).getSecrets(`publickey/jwt-service/${serviceName}`);

    if (!secrets?.SERVICE_JWT_PUBLIC_KEY) {
      throw new Error(`No publicKey for ${serviceName}`);
    }

    try {
      const payload = jwt.verify(token, secrets.SERVICE_JWT_PUBLIC_KEY, { algorithms: ['RS256'] }) as Record<string, string>;

      if (payload.serviceName !== serviceName) {
        throw new Error('ServiceName mismatch');
      }

      return serviceName;
    } catch {
      throw new Error('Service validator: invalid or expired token');
    }
  }
}
