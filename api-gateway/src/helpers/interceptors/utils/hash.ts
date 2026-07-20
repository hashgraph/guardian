import crypto from 'node:crypto';

//types and interfaces
import {IAuthUser} from '@guardian/common';

export function getHash(user: IAuthUser | null): string {
    return crypto.createHash('md5').update(JSON.stringify(user?.id ?? 'anonymous')).digest('hex');
}
