import { describe, expect, it, vi } from 'vitest';
import { PolicyApiConfigDialogComponent } from './policy-api-config-dialog.component';

const block = { tag: 'create_report', blockType: 'requestVcDocumentBlock' };
const entry = (overrides: any = {}) => ({
    name: 'Create report',
    description: '',
    target: 'create_report',
    method: 'POST',
    alias: 'create',
    url: '',
    dmrvUrl: '',
    ...overrides,
});

function create(data: any) {
    const ref = { close: vi.fn() };
    const registered = { getAbout: vi.fn(() => ({ get: false, post: true })) };
    const toast = { error: vi.fn() };
    const dialog = new PolicyApiConfigDialogComponent(
        ref as any,
        { data: { policyId: 'p1', blocks: [block], root: {}, ...data } } as any,
        registered as any,
        toast as any
    );
    return { dialog, ref };
}

describe('PolicyApiConfigDialogComponent', () => {
    it('flags an alias whose block was removed as soon as it opens', () => {
        const { dialog } = create({ entries: [entry({ target: 'removed_block', alias: 'monitoring/create' })] });
        expect(dialog.validationErrors.get(0)).toContain('no longer exists');
    });

    it('does not flag an alias whose block still exists', () => {
        const { dialog } = create({ entries: [entry()] });
        expect(dialog.validationErrors.size).toBe(0);
    });

    it('returns the entries on save', () => {
        const { dialog, ref } = create({ entries: [entry()], live: true });
        expect(dialog.live).toBe(true);
        dialog.onSave();
        expect(ref.close).toHaveBeenCalledWith([expect.objectContaining({ alias: 'create' })]);
    });

    it('does not return anything on save when read-only', () => {
        const { dialog, ref } = create({ entries: [entry()], readonly: true });
        dialog.onSave();
        expect(ref.close).not.toHaveBeenCalled();
    });
});
