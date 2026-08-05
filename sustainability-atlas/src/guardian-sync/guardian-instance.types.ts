import type { GuardianInstanceConfig } from '@shared/config/configuration';

export type { GuardianInstanceConfig };

/**
 * One event element decoded from the Application Events Module stream
 * (`GET <aemUrl>/api/events/subscribe`), which emits `{ subject, payload }`
 * objects. `payload` is left untyped — the router narrows per subject.
 */
export interface GuardianStreamEvent {
    subject: string;
    payload: unknown;
}
