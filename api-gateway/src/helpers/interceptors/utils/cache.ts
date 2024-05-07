//utils
import { getHash } from './hash.js';

//types and interfaces
import { IUser } from '@guardian/interfaces';

export function getCacheKey(route: string, user: IUser): string {
  const hashUser: string = getHash(user)
  return `cache/${route}:${hashUser}`;
}