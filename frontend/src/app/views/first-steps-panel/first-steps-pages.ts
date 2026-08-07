import { UserRole } from '@guardian/interfaces';

/*
 * Which roles get First Steps, and which authored GitBook page each one loads
 * (file name under docs/first-steps/, fetched from GitHub by the panel). First
 * Steps is gated by this map: a role that is not a key here never sees the drawer.
 * The file names match the GitBook slugs (…/first-steps/standard-registry and
 * …/first-steps/default-user). Add a role by authoring its page in
 * docs/first-steps/ and adding an entry here.
 */
export const FIRST_STEPS_PAGES: { [role: string]: string } = {
    [UserRole.STANDARD_REGISTRY]: 'standard-registry.md',
    [UserRole.USER]: 'default-user.md'
};
