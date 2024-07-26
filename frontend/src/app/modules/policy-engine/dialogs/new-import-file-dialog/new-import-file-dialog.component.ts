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
    public multiple: boolean;
    public type: 'File' | 'Buffer';

    constructor(
        public ref: DynamicDialogRef,
        public config: DynamicDialogConfig
    ) {
        this.fileExtension = this.config.data?.fileExtension;
        this.label = this.config.data?.label;
        this.multiple = !!this.config.data?.multiple;
        this.type = this.config.data?.type === 'File' ? 'File' : 'Buffer';
    }

    ngOnInit() {
        this.loading = false;
    }

    public importFromFile(event: any) {
        if (this.type === 'File') {
            this.ref.close(event);
        } else {
            const reader = new FileReader()
            reader.readAsArrayBuffer(event);
            reader.addEventListener('load', (e: any) => {
                const arrayBuffer = e.target.result;
                this.ref.close(arrayBuffer);
            });
        }
    }

    public onClose(): void {
        this.ref.close(null);
    }
}
