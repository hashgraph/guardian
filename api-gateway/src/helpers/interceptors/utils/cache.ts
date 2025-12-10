//utils
import { getHash } from './hash.js';

//types and interfaces
import { IAuthUser } from '@guardian/common';

//constants
import { CACHE_PREFIXES } from '../../../constants/index.js';

export function getCacheKey(routes: string[], user: IAuthUser | null, prefix: string = CACHE_PREFIXES.TAG): string[] {
    const hashUser: string = getHash(user);
    return routes.map(route => {
        let normalized = route;
        try {
            normalized = decodeURI(route);
        } catch (e) {
            //
        }
        return `${prefix}${normalized}:${hashUser}`;
    });
}
