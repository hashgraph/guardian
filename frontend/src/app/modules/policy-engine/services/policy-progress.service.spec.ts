import { PolicyProgressService } from './policy-progress.service';

describe('PolicyProgressService', () => {
    let service: PolicyProgressService;

    beforeEach(() => {
        service = new PolicyProgressService();
    });

    describe('policyName', () => {
        it('returns the name for the matching id', () => {
            service.setPolicy('p1', 'Carbon');
            expect(service.policyName('p1')).toBe('Carbon');
        });

        it('returns an empty string for another id', () => {
            service.setPolicy('p1', 'Carbon');
            expect(service.policyName('p2')).toBe('');
            expect(service.policyName(undefined)).toBe('');
            expect(service.policyName(null)).toBe('');
        });

        it('returns an empty string after clearPolicy', () => {
            service.setPolicy('p1', 'Carbon');
            service.clearPolicy();
            expect(service.policyName('p1')).toBe('');
        });
    });

    describe('activeStep', () => {
        it('is null before a step is set', () => {
            expect(service.activeStep).toBeNull();
        });

        it('returns the last value passed to setActiveStep', () => {
            service.setActiveStep({ label: 'Registration' });
            service.setActiveStep({ label: 'Review', parentLabel: 'Registration' });
            expect(service.activeStep).toEqual({ label: 'Review', parentLabel: 'Registration' });
        });
    });
});
