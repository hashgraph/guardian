import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges } from '@angular/core';
import { Subscription } from 'rxjs';
import { RecordService } from 'src/app/services/record.service';
import { WebSocketService } from 'src/app/services/web-socket.service';
import { ImportFileDialog } from '../../helpers/import-file-dialog/import-file-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { RecordResultDialog } from '../record-result-dialog/record-result-dialog.component';
import { Router } from '@angular/router';
import { ConfirmDialog } from 'src/app/modules/common/confirm-dialog/confirm-dialog.component';

@Component({
    selector: 'app-record-controller',
    templateUrl: './record-controller.component.html',
    styleUrls: ['./record-controller.component.scss']
})
export class RecordControllerComponent implements OnInit {
    @Input('policyId') policyId!: string;
    @Output('update') update = new EventEmitter();

    @Input('active') active!: boolean;
    @Output('activeChange') activeChange = new EventEmitter<boolean>();

    public loading: boolean = true;
    public recording: boolean = false;
    public running: boolean = false;
    public recordId: any;
    public recordItems: any[] = [];
    public recordLoading: boolean = true;
    public recordIndex: any;
    public recordCount: any;
    public recordStatus: string;
    public recordError: string;

    private _showActions: boolean = false;
    private _subscription = new Subscription();
    private _resultDialog: any;
    private _overlay: any;

    constructor(
        private wsService: WebSocketService,
        private recordService: RecordService,
        private router: Router,
        private dialog: MatDialog
    ) {
        this._showActions = (localStorage.getItem('SHOW_RECORD_ACTIONS') || 'true') === 'true';
        this._overlay = localStorage.getItem('HIDE_RECORD_OVERLAY');
    }

    ngOnInit(): void {
        this._subscription.add(
            this.wsService.recordSubscribe((message => {
                this.updateRecordLogs(message);
            }))
        );
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes.policyId) {
            if (this.policyId) {
                this.loadStatus();
            } else {
                this.loading = false;
            }
        }
    }

    ngOnDestroy() {
        this._subscription.unsubscribe();
    }

    public get overlay(): boolean {
        return this._overlay !== this.recordId;
    }

    public set overlay(value: any) {
        if (this._overlay != value) {
            this._overlay = value;
            try {
                localStorage.setItem('HIDE_RECORD_OVERLAY', String(this._overlay));
            } catch (error) {
                console.error(error);
            }
        }
    }

    public get showActions(): boolean {
        return this._showActions;
    }

    public set showActions(value: boolean) {
        if (this._showActions != value) {
            this._showActions = value;
            try {
                localStorage.setItem('SHOW_RECORD_ACTIONS', String(this._showActions));
            } catch (error) {
                console.error(error);
            }
        }
    }

    public startRecording() {
        this.loading = true;
        this.recordItems = [];
        this.recordService.startRecording(this.policyId).subscribe((result) => {
            this.recording = !!result;
            this.updateActive();
            this.loading = false;
        }, (e) => {
            this.recording = false;
            this.updateActive();
            this.loading = false;
        });
    }

    public stopRecording() {
        this.loading = true;
        this.recordItems = [];
        this.recordService.stopRecording(this.policyId).subscribe((fileBuffer) => {
            this.recording = false;
            this.running = false;
            this.updateActive();
            this.loading = false;
            const downloadLink = document.createElement('a');
            downloadLink.href = window.URL.createObjectURL(
                new Blob([new Uint8Array(fileBuffer)], {
                    type: 'application/guardian-policy-record'
                }));
            downloadLink.setAttribute('download', `record_${Date.now()}.record`);
            document.body.appendChild(downloadLink);
            downloadLink.click();
        }, (e) => {
            this.recording = false;
            this.running = false;
            this.updateActive();
            this.loading = false;
        });
    }

    public runRecord() {
        const dialogRef = this.dialog.open(ImportFileDialog, {
            width: '500px',
            autoFocus: false,
            disableClose: true,
            data: {
                fileExtension: 'record',
                label: 'Import record .record file'
            }
        });
        dialogRef.afterClosed().subscribe(async (arrayBuffer) => {
            if (arrayBuffer) {
                this.loading = true;
                this.recordItems = [];
                this.recordService.runRecord(this.policyId, arrayBuffer).subscribe((result) => {
                    this.running = !!result;
                    this.updateActive();
                    this.loading = false;
                }, (e) => {
                    this.recording = false;
                    this.updateActive();
                    this.loading = false;
                });
            }
        });
    }

    public stopRunning() {
        this.loading = true;
        this.recordItems = [];
        this.running = false;
        this.recordService.stopRunning(this.policyId).subscribe((result) => {
            this.running = false;
            this.recordId = null;
            this.updateActive();
            this.loading = false;
        }, (e) => {
            this.running = false;
            this.recordId = null;
            this.updateActive();
            this.loading = false;
        });
    }

    private loadStatus() {
        this.loading = true;
        this.recordService.getStatus(this.policyId).subscribe((record) => {
            this.updateRecordLogs(record);
            setTimeout(() => {
                this.loading = false;
            }, 500);
        }, (e) => {
            this.loading = false;
        });
    }

    private updateRecordLogs(data: any) {
        this.recording = false;
        this.running = false;
        this.recordId = null;
        if (data) {
            if (data.type === 'Running') {
                this.running = true;
                this.recordId = data.id;
                this.recordIndex = data.index;
                this.recordStatus = data.status;
                this.recordError = data.error;
                this.recordCount = data.count;
            }
            if (data.type === 'Recording') {
                this.recording = true;
                this.recordId = data.uuid;
                this.recordIndex = -1;
                this.recordStatus = data.status;
                this.recordError = data.error;
            }
            if (this.recordStatus === 'Stopped') {
                if (this.running) {
                    this.showResult();
                }
                if (this.recording) {
                    this.recording = false;
                    this.running = false;
                    this.recordId = null;
                }
            }
            if (this.recordStatus === 'Finished') {
                this.recording = false;
                this.running = false;
                this.recordId = null;
            }
        }

        if (this.recording) {
            this.recordLoading = true;
            this.recordService.getRecordedActions(this.policyId).subscribe((items) => {
                this.recordItems = items || [];
                this.updateActionItems();
                this.recordLoading = false;
            }, (e) => {
                this.recordLoading = false;
            });
        }
        if (this.running) {
            this.recordLoading = true;
            this.recordService.getRunActions(this.policyId).subscribe((items) => {
                this.recordItems = items || [];
                this.updateActionItems();
                this.recordLoading = false;
            }, (e) => {
                this.recordLoading = false;
            });
        }

        if (this.running) {
            this.updatePolicy();
        }

        this.updateActive();
    }

    private updateActionItems(): void {
        const start = this.recordItems[0];
        const startTime = start?.time;
        for (let index = 0; index < this.recordItems.length; index++) {
            const item = this.recordItems[index];
            item._time = this.convertMsToTime(item.time - startTime);
            item._index = index + 1;
            item._selected = item._index === this.recordIndex;
        }
    }

    private convertMsToTime(milliseconds: number): string {
        if (Number.isNaN(milliseconds)) {
            return ''
        }
        let seconds = Math.floor(milliseconds / 1000);
        let minutes = Math.floor(seconds / 60);
        let hours = Math.floor(minutes / 60);

        seconds = seconds % 60;
        minutes = minutes % 60;

        return `${hours}:${this.padTo2Digits(minutes)}:${this.padTo2Digits(seconds)}`;
    }

    private padTo2Digits(num: number): string {
        return num.toString().padStart(2, '0');
    }

    private updateActive() {
        this.active = this.recording || this.running;
        this.activeChange.emit(this.active);
    }

    private updatePolicy() {
        this.update.emit();
    }


    public loadRecord() {
        // this.loading = true;
        // this.policyEngineService.exportRecord(this.policyId, this.recordId)
        //     .subscribe(fileBuffer => {
        //         let downloadLink = document.createElement('a');
        //         downloadLink.href = window.URL.createObjectURL(
        //             new Blob([new Uint8Array(fileBuffer)], {
        //                 type: 'application/guardian-policy-record'
        //             })
        //         );
        //         downloadLink.setAttribute('download', `record_${Date.now()}.record`);
        //         document.body.appendChild(downloadLink);
        //         downloadLink.click();
        //         setTimeout(() => {
        //             this.loading = false;
        //         }, 500);
        //     }, error => {
        //         this.loading = false;
        //     });
    }

    public onShowActions() {
        this.showActions = !this.showActions;
    }

    public showResult() {
        this._resultDialog = this.dialog.open(RecordResultDialog, {
            width: '700px',
            panelClass: 'g-dialog',
            autoFocus: false,
            disableClose: true,
            data: {
                recordId: this.recordId,
                policyId: this.policyId
            }
        });
        this._resultDialog.afterClosed().subscribe(async (result: any) => {
            if (result === 'Details') {
                this.router.navigate(['/record-results'], {
                    queryParams: {
                        type: 'policy',
                        policyId: this.policyId,
                    }
                });
            } else if (result === 'Finish') {
                this.stopRunning()
            } else {
                return;
            }
        });
    }

    public onOverlay() {
        const dialogRef = this.dialog.open(ConfirmDialog, {
            width: '360px',
            data: {
                title: 'Confirm',
                description: `Please don't change anything now. This may break the process.`
            },
            disableClose: true,
        });
        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                this.overlay = this.recordId;
            }
        });
    }
}
