import { PolicyStatus } from '@guardian/interfaces';
import { isPolicyVersionShown } from './policy-version';

describe('isPolicyVersionShown', () => {
    it('is true for a published policy with a version', () => {
        expect(isPolicyVersionShown({ version: '1.0.0', status: PolicyStatus.PUBLISH })).toBe(true);
    });

    it('is true for a discontinued policy with a version', () => {
        expect(isPolicyVersionShown({ version: '1.0.0', status: PolicyStatus.DISCONTINUED })).toBe(true);
    });

    it('is false for a draft policy', () => {
        expect(isPolicyVersionShown({ version: '1.0.0', status: PolicyStatus.DRAFT })).toBe(false);
    });

    it('is false without a version', () => {
        expect(isPolicyVersionShown({ status: PolicyStatus.PUBLISH })).toBe(false);
        expect(isPolicyVersionShown(null)).toBe(false);
        expect(isPolicyVersionShown(undefined)).toBe(false);
    });
});
