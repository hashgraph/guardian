import { Component } from '@angular/core';
import { DialogService, DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { ExternalPoliciesService } from 'src/app/services/external-policy.service';

@Component({
    selector: 'search-external-policy-dialog',
    templateUrl: './search-external-policy-dialog.component.html',
    styleUrls: ['./search-external-policy-dialog.component.scss'],
})
export class SearchExternalPolicyDialog {
    public loading = true;
    public step: number = 1;
    public timestamp: string = '';
    public policy: any;
    public error: string = '';

    public isStandardRegistry: boolean = false;

    constructor(
        public ref: DynamicDialogRef,
        public config: DynamicDialogConfig,
        private dialogService: DialogService,
        private externalPoliciesService: ExternalPoliciesService,
    ) {
        if (this.config.data?.isStandardRegistry) {
            this.isStandardRegistry = true;
        } else {
            this.isStandardRegistry = false;
        }
    }

    ngOnInit() {
        this.loading = false;
        this.step = 1;
    }

    ngOnDestroy(): void {
    }

    public onClose(): void {
        this.ref.close(null);
    }

    public onSubmit(): void {
        this.loading = true;
        this.externalPoliciesService
            .import(this.timestamp?.trim())
            .subscribe((response) => {
                this.ref.close(response);
            }, (e) => {
                this.loading = false;
                this.step = 0;
                this.error = 'error';
            });
    }

    public onSearch(): void {
        this.loading = true;
        this.externalPoliciesService
            .preview(this.timestamp?.trim())
            .subscribe((response) => {
                this.policy = response;
                if (this.policy) {
                    this.step = 2;
                } else {
                    this.step = 0;
                    this.error = 'error';
                }
                setTimeout(() => {
                    this.loading = false;
                }, 500);
            }, (e) => {
                this.loading = false;
                this.step = 0;
                this.error = 'error';
            });
    }

    public onPrev(): void {
        this.step = 1;
    }
}
