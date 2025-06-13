import jwt from 'jsonwebtoken';

export class JwtServicesValidator {
  private static serviceName: string = '';

  public static setServiceName(name) {
    JwtServicesValidator.serviceName = name;
  }

  private static getSecretKey() {
    const secretKey = process.env.SERVICE_JWT_SECRET_KEY;

    if (secretKey?.length > 8) {
      return secretKey;
    }

    return process.env.SERVICE_JWT_SECRET_KEY_ALL
  }

  private static getPublicKeyByServiceName(serviceName = 'ALL') {
    const publicKey = process.env[`SERVICE_JWT_PUBLIC_KEY_${serviceName}`];

    if (publicKey?.length > 8) {
      return publicKey;
    }

    return process.env.SERVICE_JWT_PUBLIC_KEY_ALL
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
