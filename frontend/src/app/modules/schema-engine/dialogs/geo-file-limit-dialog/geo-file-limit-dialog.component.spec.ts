import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { GeoFileLimitDialogComponent } from './geo-file-limit-dialog.component';

describe('GeoFileLimitDialogComponent', () => {
    it('returns acceptance from warning mode', () => {
        const ref = jasmine.createSpyObj<DynamicDialogRef>('DynamicDialogRef', ['close']);
        const component = new GeoFileLimitDialogComponent({
            data: { mode: 'warn', message: 'warning' }
        } as DynamicDialogConfig, ref);

        component.close(true);

        expect(component.mode).toBe('warn');
        expect(component.message).toBe('warning');
        expect(ref.close).toHaveBeenCalledOnceWith(true);
    });

    it('returns false from reject mode', () => {
        const ref = jasmine.createSpyObj<DynamicDialogRef>('DynamicDialogRef', ['close']);
        const component = new GeoFileLimitDialogComponent({
            data: { mode: 'reject', message: 'error' }
        } as DynamicDialogConfig, ref);

        component.close(false);

        expect(component.mode).toBe('reject');
        expect(ref.close).toHaveBeenCalledOnceWith(false);
    });
});
