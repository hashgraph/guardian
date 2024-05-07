import crypto from 'crypto';

//types and interfaces
import { IUser } from '@guardian/interfaces';

export function getHash(user: IUser): string {
  return crypto.createHash('md5').update(JSON.stringify(user)).digest('hex');
}