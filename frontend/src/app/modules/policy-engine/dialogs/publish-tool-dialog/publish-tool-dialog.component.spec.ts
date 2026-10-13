import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { PublishToolDialog } from './publish-tool-dialog.component';

describe('PublishToolDialog', () => {
    function create(tool: any = {}): PublishToolDialog {
        const config = new DynamicDialogConfig();
        config.data = { tool };
        return new PublishToolDialog(new DynamicDialogRef(), config);
    }

    function enter(dialog: PublishToolDialog, value: string): void {
        dialog.versionControl.setValue(value);
        dialog.versionControl.markAsDirty();
    }

    it('shows no version error before the user edits the field', () => {
        const dialog = create();
        expect(dialog.isPublishDisabled).toBe(true);
        expect(dialog.versionError).toBeNull();
    });

    it('explains a version that contains a letter', () => {
        const dialog = create();
        enter(dialog, '1.a');
        expect(dialog.isPublishDisabled).toBe(true);
        expect(dialog.versionError).toBe('Version must contain only numbers separated by dots, for example 1, 1.0 or 1.0.0');
    });

    it('explains an empty version once the field is touched', () => {
        const dialog = create();
        dialog.versionControl.markAsTouched();
        expect(dialog.isPublishDisabled).toBe(true);
        expect(dialog.versionError).toBe('Version is required');
    });

    it('explains a version that is not greater than the previous one', () => {
        const dialog = create({ previousVersion: '1.0.0' });
        enter(dialog, '1.0.0');
        expect(dialog.isPublishDisabled).toBe(true);
        expect(dialog.versionError).toBe('Version must be greater than 1.0.0');
    });

    it('clears the error and enables publishing for a valid newer version', () => {
        const dialog = create({ previousVersion: '1.0.0' });
        enter(dialog, '1.a');
        expect(dialog.versionError).not.toBeNull();
        enter(dialog, '1.0.1');
        expect(dialog.isPublishDisabled).toBe(false);
        expect(dialog.versionError).toBeNull();
    });

    it('accepts any valid version when there is no previous version', () => {
        const dialog = create();
        enter(dialog, '1');
        expect(dialog.isPublishDisabled).toBe(false);
        expect(dialog.versionError).toBeNull();
    });
});
