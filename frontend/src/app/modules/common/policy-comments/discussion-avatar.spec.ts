import { AVATAR_PALETTE, getAvatarColor, getInitials } from './discussion-avatar';

describe('discussion avatar', () => {
    it('takes up to two initials and ignores digits, # and _', () => {
        expect(getInitials('Findings #1')).toBe('F');
        expect(getInitials('Baseline emissions')).toBe('BE');
        expect(getInitials('monitoring period clarification')).toBe('MP');
        expect(getInitials('Demo_User')).toBe('DU');
    });

    it('falls back to # when there is nothing to show', () => {
        expect(getInitials('')).toBe('#');
        expect(getInitials('#1 _')).toBe('#');
        expect(getInitials(undefined as any)).toBe('#');
    });

    it('gives the same name the same colour, taken from the palette', () => {
        const names = ['Findings #1', 'Baseline emissions', 'General review notes', '', 'Start date mismatch'];
        for (const name of names) {
            expect(getAvatarColor(name)).toBe(getAvatarColor(name));
            expect(AVATAR_PALETTE).toContain(getAvatarColor(name));
        }
    });
});
