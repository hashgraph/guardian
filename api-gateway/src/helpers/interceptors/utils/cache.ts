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
        if (prefix === CACHE_PREFIXES.TAG) {
            // A tag groups every cached response of a route, whatever its query
            // string, so it must be built from the path alone - otherwise a
            // mutation carrying query params invalidates a tag that never exists.
            normalized = normalized.split('?')[0];
        }
        return `${prefix}${normalized}:${hashUser}`;
    });
}
