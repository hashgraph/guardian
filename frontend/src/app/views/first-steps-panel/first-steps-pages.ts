import { UserRole } from '@guardian/interfaces';

/*
 * Which roles get First Steps, and which authored GitBook page (file name under
 * assets/first-steps/, copied from docs/first-steps/) each one loads. First Steps
 * is gated by this map: a role that is not a key here never sees the drawer.
 *
 * Currently Standard Registry only, pointing at the GitBook-maintained page. To
 * enable it for another role later, author a page in docs/first-steps/ and add an
 * entry here (and, for a non-registry role, add the "First Steps" toggle to that
 * role's profile), e.g.:
 *   [UserRole.USER]: 'first-steps-with-digital-environmental-assets-user.md',
 */
export const FIRST_STEPS_PAGES: { [role: string]: string } = {
    [UserRole.STANDARD_REGISTRY]: 'first-steps-with-digital-environmental-assets-complex.md'
};
