//utils
import { getHash } from './hash.js';

//types and interfaces
import { IAuthUser } from '@guardian/common';

//constants
import { CACHE_PREFIXES } from '../../../constants/index.js';

export function getCacheKey(routes: string[], user: IAuthUser | {}, prefix: string = CACHE_PREFIXES.TAG): string[] {
  const hashUser: string = getHash(user)
  return routes.map(route => `${prefix}${route}:${hashUser}`);
}