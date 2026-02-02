import { Component } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';

@Component({
    selector: 'user-keys-dialog',
    templateUrl: './user-keys-dialog.component.html',
    styleUrls: ['./user-keys-dialog.component.scss'],
})
export class UserKeysDialog {
    public loading = true;
    public type: 'create' | 'import' | 'preview'
    public dataForm: UntypedFormGroup;

    constructor(
        public ref: DynamicDialogRef,
        public config: DynamicDialogConfig,
        private fb: UntypedFormBuilder,
    ) {
        this.type = this.config.data?.type || 'create';

        if (this.type === 'create') {
            this.dataForm = this.fb.group({
                messageId: ['', Validators.required]
            });
        } else if (this.type === 'import') {
            this.dataForm = this.fb.group({
                messageId: ['', Validators.required],
                key: ['', Validators.required]
            });
        } else {
            const key = this.config.data?.key || '';
            this.dataForm = this.fb.group({
                key: [key, Validators.required]
            });
        }
    }

    ngOnInit() {
        this.loading = false;
    }

    ngOnDestroy(): void {
    }

    public onClose(): void {
        this.ref.close(null);
    }

    public onCreate(): void {
        if (this.dataForm.valid) {
            const {
                messageId
            } = this.dataForm.value;
            this.ref.close({
                messageId
            });
        }
    }

    public onImport(): void {
        if (this.dataForm.valid) {
            const {
                messageId,
                key
            } = this.dataForm.value;
            this.ref.close({
                messageId: (messageId || '').trim(),
                key: (key || '').trim(),
            });
        }
    }
}
