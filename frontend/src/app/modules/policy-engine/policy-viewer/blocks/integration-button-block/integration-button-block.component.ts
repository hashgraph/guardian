import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnInit, } from '@angular/core';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { WebSocketService } from 'src/app/services/web-socket.service';
import { HttpErrorResponse } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';
import {DialogService} from 'primeng/dynamicdialog';
import {VCViewerDialog} from 'src/app/modules/schema-engine/vc-dialog/vc-dialog.component';

/**
 * Component for display block of 'Integration Button Block' type.
 */
@Component({
    selector: 'integration-button-block',
    templateUrl: './integration-button-block.component.html',
    styleUrls: ['./integration-button-block.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class IntegrationButtonBlockComponent implements OnInit {
    @Input('id') id!: string;
    @Input('policyId') policyId!: string;
    @Input('static') static!: any;

    loading: boolean = true;
    socket: any;
    data: any;
    buttonName: string;
    url: string;
    testFieldPath: string;
    readonly: boolean = false;
    commonVisible: boolean = false;
    integrationType: string;

    // private readonly _commentField: string = 'option.comment';

    constructor(
        private policyEngineService: PolicyEngineService,
        private wsService: WebSocketService,
        private cdref: ChangeDetectorRef,
        private toastr: ToastrService,
        private dialogService: DialogService,
    ) {
    }

    ngOnInit(): void {
        if (!this.static) {
            this.socket = this.wsService.blockSubscribe(
                this.onUpdate.bind(this)
            );
        }
        this.loadData();
    }

    ngOnDestroy(): void {
        if (this.socket) {
            this.socket.unsubscribe();
        }
    }

    onUpdate(blocks: string[]): void {
        if (Array.isArray(blocks) && blocks.includes(this.id)) {
            this.loadData();
        }
    }

    loadData() {
        this.loading = true;
        if (this.static) {
            this.setData(this.static);
            setTimeout(() => {
                this.loading = false;
                this.cdref.detectChanges();
                this.commonVisible = true;
            }, 500);
        } else {
            this.policyEngineService
                .getBlockData(this.id, this.policyId)
                .subscribe(this._onSuccess.bind(this), this._onError.bind(this));
        }
    }

    private _onSuccess(data: any) {
        this.setData(data);

        setTimeout(() => {
            this.loading = false;
            this.commonVisible = true;
            this.cdref.detectChanges();
        }, 500);
    }

    private _onError(e: HttpErrorResponse) {
        console.error(e.error);
        if (e.status === 503) {
            this._onSuccess(null);
        } else {
            this.loading = false;
            this.cdref.detectChanges();
        }
    }

    setData(data: any) {
        if (data) {
            this.readonly = !!data.readonly;
            this.data = data.data;
            this.buttonName = data.buttonName;
            this.url = data.url;
            this.testFieldPath = data.testFieldPath;
            this.integrationType = data.integrationType;
        } else {
            this.data = null;
        }
    }

    openDialog(document: any, data: any) {
        const dialogRef = this.dialogService.open(VCViewerDialog, {
            showHeader: false,
            width: '1000px',
            styleClass: 'guardian-dialog',
            data: {
                title: 'VC',
                row: document,
                id: document.id,
                dryRun: !!document.dryRunId,
                viewDocument: true,
                document: document.document,
                type: 'VC',
                additionalOptions: [
                    { label: 'Integration Data', value: 'integration', icon: 'number' },
                ],
                additionalOptionsData: [
                    {
                        type: 'JSON',
                        data: JSON.stringify(data, null, 4),
                        optionValue: 'integration'
                    }
                ]
            },
        });
        dialogRef.onClose.subscribe(async (result) => {
        });
    }

    onClick() {
        this.loading = true;
        this.commonVisible = false;

        this.policyEngineService.setBlockData(this.id, this.policyId, this.data).subscribe({
            next:(data) => {
                this.commonVisible = true;
                this.loading = false;

                if(data) {
                    this.openDialog(this.data, data);
                }

                this.cdref.detectChanges();
            },
            error: (e) => {
                this.commonVisible = true;
                console.error(e.error);
                this.loading = false;
                this.cdref.detectChanges();
            },
        })
    }
}
