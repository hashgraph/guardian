import {Component, EventEmitter, Input, OnInit, Output, SimpleChanges} from '@angular/core';
import {Subscription} from 'rxjs';
import {RecordService} from 'src/app/services/record.service';
import {WebSocketService} from 'src/app/services/web-socket.service';
import {RecordResultDialog} from '../record-result-dialog/record-result-dialog.component';
import {Router} from '@angular/router';
import {ConfirmDialog} from 'src/app/modules/common/confirm-dialog/confirm-dialog.component';
import {DialogService} from 'primeng/dynamicdialog';
import {
    IImportEntityResult,
    ImportEntityDialog,
    ImportEntityType
} from 'src/app/modules/common/import-entity-dialog/import-entity-dialog.component';
import { PolicyTestAutomationService } from '../../policy-viewer/policy-test-automation/policy-test-automation.service';
import {IRecordPolicyTestMetadata} from '@guardian/interfaces';
import {
    SavePolicyTestRecordDialog,
    SavePolicyTestRecordResult
} from '../save-policy-test-record-dialog/save-policy-test-record-dialog.component';

@Component({
    selector: 'app-record-controller',
    templateUrl: './record-controller.component.html',
    styleUrls: ['./record-controller.component.scss']
})
export class RecordControllerComponent implements OnInit {
    @Input('policyId') policyId!: string;
    @Output('update') update = new EventEmitter();
    @Input() withRecords?: boolean | null;

    @Input('active') active!: boolean;
    @Output('activeChange') activeChange = new EventEmitter<boolean>();

    public loading: boolean = true;
    public recording: boolean = false;
    public running: boolean = false;
    public recordId: string | null;
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
        private dialogService: DialogService,
        private recordService: RecordService,
        private router: Router,
        private dialog: DialogService,
        private policyTest: PolicyTestAutomationService,
    ) {
        this._showActions = (localStorage.getItem('SHOW_RECORD_ACTIONS') || 'true') === 'true';
        this._overlay = localStorage.getItem('HIDE_RECORD_OVERLAY');
    }

    ngOnInit(): void {
        this._subscription.add(
            this.wsService.recordSubscribe((message => {
                if (message.policyId === this.policyId) {
                    this.updateRecordLogs(message);
                }
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
        this.policyTest.reset();
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
        if (this.policyTest.hasInput()) {
            this.openNoOutputWarning();
            return;
        }

        this.openSaveRecordDialog(true);
    }

    private openNoOutputWarning(): void {
        const dialogRef = this.dialog.open(ConfirmDialog, {
            width: '560px',
            data: {
                title: 'Stop and Discard Input?',
                description: [
                    'Input test data was not captured or there is no corresponding output document(s) selected.',
                    'Stop this recording and discard input test data?'
                ],
                submitButton: 'Confirm',
                cancelButton: 'Cancel'
            },
            modal: true,
            closable: false
        });

        dialogRef.onClose.subscribe((confirmed: boolean) => {
            if (confirmed) {
                this.openSaveRecordDialog(false);
            }
        });
    }

    private openSaveRecordDialog(includePolicyTestMetadata: boolean): void {
        const dialogRef = this.dialog.open(SavePolicyTestRecordDialog, {
            showHeader: false,
            width: '560px',
            styleClass: 'guardian-dialog',
            data: {
                name: this.policyTest.state.name,
                description: this.policyTest.state.description
            }
        });

        dialogRef.onClose.subscribe((result: SavePolicyTestRecordResult | null) => {
            if (!result) {
                return;
            }

            this.policyTest.setMetadata(result.name, result.description);
            this.stopRecordingInternal(result, includePolicyTestMetadata);
        });
    }

    private stopRecordingInternal(
        saveMetadata: SavePolicyTestRecordResult,
        includePolicyTestMetadata: boolean
    ): void {
        this.loading = true;
        this.recordItems = [];
        const filename = this.sanitizeRecordFilename(saveMetadata.name);
        const policyTest = this.buildPolicyTestMetadata(saveMetadata, includePolicyTestMetadata);
        this.recordService.stopRecording(this.policyId, { policyTest }).subscribe((fileBuffer) => {
            this.recording = false;
            this.running = false;
            this.updateActive();
            this.loading = false;
            this.policyTest.reset();
            if (saveMetadata.saveToFile !== false) {
                const downloadLink = document.createElement('a');
                downloadLink.href = window.URL.createObjectURL(
                    new Blob([new Uint8Array(fileBuffer)], {
                        type: 'application/guardian-policy-record'
                    }));
                downloadLink.setAttribute('download', filename);
                document.body.appendChild(downloadLink);
                downloadLink.click();
            }
        }, (e) => {
            this.recording = false;
            this.running = false;
            this.updateActive();
            this.loading = false;
        });
    }

    private buildPolicyTestMetadata(
        saveMetadata: SavePolicyTestRecordResult,
        includePolicyTestMetadata: boolean
    ): IRecordPolicyTestMetadata {
        const baseMetadata = includePolicyTestMetadata
            ? this.policyTest.getRecordMetadata()
            : null;

        return {
            ...(baseMetadata || {}),
            name: saveMetadata.name,
            description: saveMetadata.description
        };
    }

    private sanitizeRecordFilename(name: string): string {
        const value = (name || '')
            .trim()
            .replace(/[<>:"/\\|?*\x00-\x1F]/g, '-')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '')
            .slice(0, 80);

        return `${value || `record_${Date.now()}`}.record`;
    }

    public runRecord() {
        const dialogRef = this.dialogService.open(ImportEntityDialog, {
            showHeader: false,
            width: '80%',
            styleClass: 'guardian-dialog',
            data: {
                type: ImportEntityType.Record,
                withRecords: this.withRecords,
                policyId: this.policyId
            }
        });
        dialogRef.onClose.subscribe(async (result: IImportEntityResult | null) => {
            if (result) {
                this.loading = true;
                this.recordItems = [];
                this.overlay = null;
                const options: any = {};
                if (result?.importRecords) {
                    options.importRecords = true;
                }
                if (result?.syncNewRecords) {
                    options.syncNewRecords = true;
                }
                if (result?.fromPolicyId) {
                    options.fromPolicyId = result?.fromPolicyId;
                }
                this.recordService.runRecord(this.policyId, result.data, options).subscribe((result) => {
                    this.running = !!result;
                    this.updateActive();
                    this.loading = false;
                }, (e) => {
                    this.recording = false;
                    this.updateActive();
                    this.loading = false;
                });
            } else {
                this.updateActive();
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
            this.policyTest.reset();
        }, (e) => {
            this.running = false;
            this.recordId = null;
            this.updateActive();
            this.loading = false;
        });
    }

    public fastForward() {
        this.recordService.fastForward(this.policyId, {
            index: this.recordIndex
        }).subscribe((record) => {
        }, (e) => {
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
                this.recordId = String(data.id);
                this.recordIndex = data.index;
                this.recordStatus = data.status;
                this.recordError = data.error;
                this.recordCount = data.count;
            }
            if (data.type === 'Recording') {
                this.recording = true;
                this.recordId = String(data.uuid);
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

    private getActionUser(item: any, userMap: Map<string, string>): string {
        if (item.method === 'START') {
            const name = 'Administrator';
            userMap.set(item.user, name);
            return name;
        }
        if (item.action === 'CREATE_USER') {
            const name = `Virtual User ${userMap.size}`;
            userMap.set(item.user, name);
            return name;
        }
        if (userMap.has(item.user)) {
            return userMap.get(item.user) as string;
        } else {
            return item.user;
        }
    }

    private getActionTitle(item: any, user: string): string {
        if (item.method === 'START') {
            return 'Start';
        }
        if (item.method === 'STOP') {
            return 'Stop';
        }
        if (item.method === 'GENERATE') {
            if (item.action === 'GENERATE_UUID') {
                return 'Generate UUID';
            }
            if (item.action === 'GENERATE_DID') {
                return 'Generate DID';
            }
            return 'Generate';
        }
        if (item.method === 'ACTION') {
            if (item.action === 'SELECT_POLICY_GROUP') {
                return 'Select group';
            }
            if (item.action === 'SET_BLOCK_DATA') {
                if (item.target) {
                    return `Send data (${item.target})`;
                }
                return 'Send data';
            }
            if (item.action === 'SET_EXTERNAL_DATA') {
                return 'Send external data';
            }
            if (item.action === 'CREATE_USER') {
                return `Create user (${user})`;
            }
            if (item.action === 'SET_USER') {
                return `Select user (${user})`;
            }
            return 'Action';
        }
        return item.action || item.method;
    }

    private getActionTooltip(item: any, user: string): string {
        let tooltip = '';
        if (item.method) {
            tooltip += `Method: ${item.method}\r\n`;
        }
        if (item.action) {
            tooltip += `Action: ${item.action}\r\n`;
        }
        if (item.user) {
            tooltip += `User: ${item.user}\r\n`;
        }
        if (user) {
            tooltip += `User Name: ${user}\r\n`;
        }
        if (item.target) {
            tooltip += `Target: ${item.target}\r\n`;
        }
        return tooltip;
    }

    private updateActionItems(): void {
        const start = this.recordItems[0];
        const startTime = start?.time;
        const userMap = new Map<string, string>();
        const lastIndex = Math.min(this.recordIndex, this.recordItems.length - 1);
        for (let index = 0; index < this.recordItems.length; index++) {
            const item = this.recordItems[index];
            const user = this.getActionUser(item, userMap);
            item._time = this.convertMsToTime(new Date(item.time).getTime() - new Date(startTime).getTime());
            item._index = index + 1;
            item._selected = index === lastIndex;
            item._title = this.getActionTitle(item, user);
            item._tooltip = this.getActionTooltip(item, user);
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

    public onShowActions() {
        this.showActions = !this.showActions;
    }

    public showResult() {
        this._resultDialog = this.dialog.open(RecordResultDialog, {
            width: '90%',
            styleClass: 'guardian-dialog',
            modal: true,
            closable: false,
            showHeader: false,
            data: {
                recordId: this.recordId,
                policyId: this.policyId
            }
        });
        this._resultDialog.onClose.subscribe(async (result: any) => {
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
                description: `You actions in the UI may influence the policy execution replay flow, and result in errors or other discrepancies. Do you wish to continue?`,
                submitButton: 'Continue',
                cancelButton: 'Cancel'
            },
            modal: true,
            closable: false,
        });
        dialogRef.onClose.subscribe(result => {
            if (result) {
                this.overlay = this.recordId;
            }
        });
    }

    public retryStep() {
        this.loading = true;
        this.recordItems = [];
        this.recordService.retryStep(this.policyId).subscribe((result) => {
            this.running = !!result;
            this.updateActive();
            this.loading = false;
        }, (e) => {
            this.recording = false;
            this.updateActive();
            this.loading = false;
        });
    }

    public skipStep() {
        this.loading = true;
        this.recordItems = [];
        this.recordService.skipStep(this.policyId).subscribe((result) => {
            this.running = !!result;
            this.updateActive();
            this.loading = false;
        }, (e) => {
            this.recording = false;
            this.updateActive();
            this.loading = false;
        });
    }
}
