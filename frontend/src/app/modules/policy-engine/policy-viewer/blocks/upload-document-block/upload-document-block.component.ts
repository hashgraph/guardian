import {Component, Input, OnInit, TemplateRef, ViewChild} from '@angular/core';
import {PolicyEngineService} from 'src/app/services/policy-engine.service';
import {PolicyHelper} from 'src/app/services/policy-helper.service';
import {ProfileService} from 'src/app/services/profile.service';
import {WebSocketService} from 'src/app/services/web-socket.service';
import {HttpErrorResponse} from '@angular/common/http';
import {DialogService} from 'primeng/dynamicdialog';

/**
 * Component for display block of 'requestVcDocument' types.
 */
@Component({
    selector: 'request-document-block',
    templateUrl: './upload-document-block.component.html',
    styleUrls: ['./upload-document-block.component.scss'],
    providers: [DialogService]
})
export class UploadDocumentBlockComponent implements OnInit {
    @Input('id') id!: string;
    @Input('policyId') policyId!: string;
    @Input('static') static!: any;
    @ViewChild("dialogTemplate") dialogTemplate!: any;

    isExist = false;
    disabled = false;
    loading: boolean = true;
    socket: any;
    dialogLoading: boolean = false;
    type!: string;
    buttonText: string = '';
    dialogTitle: string = '';
    dialogClass: string = '';
    dialogRef: any;
    pageTitle: string = '';
    pageDescription: string = '';
    dialogDescription: string = '';
    buttonClass: string = '';
    readonly: boolean = false;

    public items: unknown[] = []

    constructor(
        private policyEngineService: PolicyEngineService,
        private wsService: WebSocketService,
        private profile: ProfileService,
        private policyHelper: PolicyHelper,
        private dialog: DialogService,
    ) {
    }

    ngOnInit(): void {
        if (!this.static) {
            this.socket = this.wsService.blockSubscribe(this.onUpdate.bind(this));
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
            }, 500);
        } else {
            this.policyEngineService
                .getBlockData(this.id, this.policyId, this.savepointId)
                .subscribe(this._onSuccess.bind(this), this._onError.bind(this));
        }
    }

    private _onSuccess(data: any) {
        this.setData(data);
        setTimeout(() => {
            this.loading = false;
        }, 500);
    }

    private _onError(e: HttpErrorResponse) {
        console.error(e.error);
        if (e.status === 503) {
            this._onSuccess(null);
        } else {
            this.loading = false;
        }
    }

    setData(data: any) {
        if (data) {
            this.readonly = !!data.readonly;
            this.type = data.uiMetaData.type;
            if (this.type == 'dialog') {
                this.buttonText = data.uiMetaData.buttonText;
                this.buttonClass = data.uiMetaData.buttonClass;
                this.dialogTitle = data.uiMetaData.dialogTitle;
                this.dialogClass = data.uiMetaData.dialogClass;
                this.dialogDescription = data.uiMetaData.dialogDescription;
            }
            if (this.type == 'page') {
                this.pageTitle = data.uiMetaData.pageTitle;
                this.pageDescription = data.uiMetaData.pageDescription;
            }
            this.disabled = false;
            this.isExist = true;
        } else {
            this.disabled = false;
            this.isExist = false;
        }
    }

    onSubmit($event: any) {
        this.dialogLoading = true;
        this.loading = true;
        this.policyEngineService
            .setBlockData(this.id, this.policyId, {
                documents: this.items,
            }).subscribe(() => {
            setTimeout(() => {
                if (this.dialogRef) {
                    this.dialogRef.close();
                    this.dialogRef = null;
                }
                this.dialogLoading = false;
            }, 1000);
        }, (e) => {
            console.error(e.error);
            this.dialogLoading = false;
            this.loading = false;
        });
    }

    onCancel(): void {
        if (this.dialogRef) {
            this.dialogRef.close();
            this.dialogRef = null;
        }
    }

    onDialog() {
        if (window.innerWidth <= 810) {
            const bodyStyles = window.getComputedStyle(document.body);
            const headerHeight: number = parseInt(bodyStyles.getPropertyValue('--header-height'));
            this.dialogRef = this.dialog.open(this.dialogTemplate, {
                width: `100vw`,
                height: `${window.innerHeight - headerHeight}px`,
                styleClass: 'g-dialog',
                closable: true,
                data: this
            });
        } else {
            this.dialogRef = this.dialog.open(this.dialogTemplate, {
                width: '850px',
                modal: true,
                closable: false,
                data: this
            });
        }
    }

    onDrop(files: any): void {
        for (const file of files) {
            const reader = new FileReader();
            reader.addEventListener('load', (event: any) => {
                this.items.push(JSON.parse(event.target.result))
            })
            reader.readAsText(file);
        }
    }

    uploadText(): string {
        if (this.items.length === 0) {
            return 'Drop file here';
        }
        return `${this.items.length} files added`

    }
}
