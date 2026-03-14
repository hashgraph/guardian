import { Component } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { DialogService, DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';

@Component({
    selector: 'mock-up-dialog',
    templateUrl: './mock-up-dialog.component.html',
    styleUrls: ['./mock-up-dialog.component.scss'],
})
export class MockUpDialog {
    public loading = true;
    public dataForm: FormGroup;
    public title: string;
    public action: string;
    public type: 'IPFS' | 'MESSAGE' | 'TOKEN' | 'ACCOUNT' | 'API';

    constructor(
        public ref: DynamicDialogRef,
        public config: DynamicDialogConfig,
        private dialogService: DialogService,
    ) {
        this.title = this.config.data?.title || 'Add mockup data';
        this.action = this.config.data?.action || 'Add';
        this.type = this.config.data?.type || 'IPFS';

        if (this.type === 'IPFS') {
            this.dataForm = new FormGroup({
                cid: new FormControl<string>('', Validators.required),
                content: new FormControl<string>('', Validators.required),
            });
        } else if (this.type === 'MESSAGE') {
            this.dataForm = new FormGroup({
                topicId: new FormControl<string>('', Validators.required),
                consensusTimestamp: new FormControl<string>('', Validators.required),
                payerAccountId: new FormControl<string>('', Validators.required),
                message: new FormControl<string>('', Validators.required),
            });
        } else if (this.type === 'TOKEN') {
            this.dataForm = new FormGroup({
                tokenId: new FormControl<string>('', Validators.required),
            });
        } else if (this.type === 'ACCOUNT') {
            this.dataForm = new FormGroup({
                accountId: new FormControl<string>('', Validators.required),
            });
        } else if (this.type === 'API') {
            this.dataForm = new FormGroup({
                url: new FormControl<string>('', Validators.required),
            });
        } else {
            this.dataForm = new FormGroup({});
            return;
        }

        if (this.config.data?.item) {
            this.dataForm.setValue(this.config.data.item)
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

    public onSubmit(): void {
        if (this.dataForm.valid) {
            const item = this.dataForm.value;
            this.ref.close(item);
        }
    }
}
