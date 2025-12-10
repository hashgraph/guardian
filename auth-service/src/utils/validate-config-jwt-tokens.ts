import pkg from 'jsonwebtoken';

const { sign, verify } = pkg;

const looksLikePem = (s: string) =>
  s.includes('BEGIN') && s.includes('END') && s.includes('-----');

export function checkValidJwt(publicKey: string, privateKey: string) {
  try {
    if (privateKey?.trim()?.length < 8 || publicKey?.trim()?.length < 8) {
      console.error('JWT keys are missing or empty');
      return false;
    }

    if (!looksLikePem(privateKey) || !looksLikePem(publicKey)) {
      console.error('JWT keys are not valid PEM strings');
      return false;
    }

    const probe = sign({ ping: true }, privateKey, { algorithm: 'RS256', expiresIn: '1m' });
    verify(probe, publicKey, { algorithms: ['RS256'] });

    return true;
  } catch (e: any) {
    console.error(e, 'checkValidJwt');

    return false;
  }
}
