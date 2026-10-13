import { Component } from '@angular/core';
import { DialogService, DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { CustomConfirmDialogComponent } from '../../../common/custom-confirm-dialog/custom-confirm-dialog.component';
import { UploadFormulaFileDialog } from '../upload-formula-file-dialog/upload-formula-file-dialog.component';
import { Formulas } from '../../models/formulas';

@Component({
    selector: 'formula-files-dialog',
    templateUrl: './formula-files-dialog.component.html',
    styleUrls: ['./formula-files-dialog.component.scss'],
    standalone: false
})
export class FormulaFilesDialog {
    public config: Formulas;
    public readonly: boolean = false;
    public changed: boolean = false;

    constructor(
        public ref: DynamicDialogRef,
        public dialogConfig: DynamicDialogConfig,
        private dialogService: DialogService
    ) {
        this.config = this.dialogConfig.data?.config;
        this.readonly = !!this.dialogConfig.data?.readonly;
    }

    public onClose(): void {
        this.ref.close(this.changed);
    }

    public uploadFile(): void {
        const dialogRef = this.dialogService.open(UploadFormulaFileDialog, {
            showHeader: false,
            width: '640px',
            styleClass: 'guardian-dialog',
            data: {},
        })!;
        dialogRef.onClose.subscribe((result: any) => {
            if (result) {
                this.config.addFile(result);
                this.changed = true;
            }
        });
    }

    public deleteFile(file: any): void {
        const dialogRef = this.dialogService.open(CustomConfirmDialogComponent, {
            showHeader: false,
            width: '640px',
            styleClass: 'guardian-dialog',
            data: {
                header: 'Delete file',
                text: 'Are you sure want to delete file?',
                buttons: [{
                    name: 'Close',
                    class: 'secondary'
                }, {
                    name: 'Delete',
                    class: 'delete'
                }]
            },
        })!;
        dialogRef.onClose.subscribe((result: string) => {
            if (result === 'Delete') {
                this.config.deleteFile(file);
                this.changed = true;
            }
        });
    }
}
