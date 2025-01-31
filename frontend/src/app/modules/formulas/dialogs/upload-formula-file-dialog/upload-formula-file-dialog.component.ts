import { ChangeDetectorRef, Component } from '@angular/core';
import { UntypedFormBuilder, Validators } from '@angular/forms';
import { DialogService, DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { IPFS_SCHEMA } from 'src/app/services/api';
import { IPFSService } from 'src/app/services/ipfs.service';

@Component({
    selector: 'upload-formula-file-dialog',
    templateUrl: './upload-formula-file-dialog.component.html',
    styleUrls: ['./upload-formula-file-dialog.component.scss'],
})
export class UploadFormulaFileDialog {
    public loading = true;
    public importType: string = 'file';
    public dataForm = this.fb.group({
        name: ['', Validators.required],
        url: ['', Validators.required],
    });
    public items = [
        { label: 'Import from file' },
        { label: 'Import from IPFS' },
    ];
    public fileExtension = '';
    public placeholder = 'Upload file';
    public step: number = 0;

    constructor(
        public ref: DynamicDialogRef,
        public config: DynamicDialogConfig,
        private dialogService: DialogService,
        private fb: UntypedFormBuilder,
        private ipfs: IPFSService,
        private changeDetectorRef: ChangeDetectorRef,
    ) {

    }

    ngOnInit() {
        this.loading = false;
        this.importType = 'file';
        this.step = 0;
    }

    ngOnDestroy(): void {
    }

    public setImportType(event: any): void {
        this.importType = event.index === 0 ? 'file' : 'url';
        this.step = 0;
        this.dataForm.setValue({
            name: '',
            url: ''
        })
        this.changeDetectorRef.detectChanges();
    }

    public onClose(): void {
        this.ref.close(null);
    }

    public onSubmit(): void {
        if (this.dataForm.valid) {
            const { name, url } = this.dataForm.value;
            this.ref.close({
                name,
                url,
                type: this.importType
            });
        }
    }

    public importFromFile(file: any) {
        const name = file.name;
        this.upload(name, file);
    }

    private upload(name: string, file: any) {
        this.loading = true;
        this.ipfs.addFile(file)
            .subscribe((res) => {
                const url = IPFS_SCHEMA + res;
                this.dataForm.setValue({ name, url });
                this.step = 1;
                this.loading = false;
            }, (error) => {
                this.loading = false;
            });
    }
}