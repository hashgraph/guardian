import crypto from 'crypto';

//types and interfaces
import { IAuthUser } from '@guardian/common';

export function getHash(user: IAuthUser | {}): string {
  return crypto.createHash('md5').update(JSON.stringify(user)).digest('hex');
}