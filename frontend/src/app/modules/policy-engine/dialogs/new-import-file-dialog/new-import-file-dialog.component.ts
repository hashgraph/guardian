import { Component } from '@angular/core';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';

@Component({
    selector: 'new-import-file-dialog',
    templateUrl: './new-import-file-dialog.component.html',
    styleUrls: ['./new-import-file-dialog.component.scss'],
})
export class NewImportFileDialog {
    public loading = true;
    public fileExtension: string;
    public label: string;

    constructor(
        public ref: DynamicDialogRef,
        public config: DynamicDialogConfig
    ) {
        this.fileExtension = this.config.data?.fileExtension;
        this.label = this.config.data?.label;
    }

    ngOnInit() {
        this.loading = false;
    }

    public importFromFile(file: any) {
        const reader = new FileReader()
        reader.readAsArrayBuffer(file);
        reader.addEventListener('load', (e: any) => {
            const arrayBuffer = e.target.result;
            this.ref.close(arrayBuffer);
        });
    }

    public onClose(): void {
        this.ref.close(null);
    }
}
