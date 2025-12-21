import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnInit } from '@angular/core';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { PolicyHelper } from 'src/app/services/policy-helper.service';
import { WebSocketService } from 'src/app/services/web-socket.service';
import { ConfirmationDialog } from '../confirmation-dialog/confirmation-dialog.component';
import { DialogService } from 'primeng/dynamicdialog';
import { HttpErrorResponse } from '@angular/common/http';
import { PolicyStatus } from '@guardian/interfaces';

/**
 * Component for display block of 'Buttons' type.
 */
@Component({
    selector: 'button-block',
    templateUrl: './button-block.component.html',
    styleUrls: ['./button-block.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ButtonBlockComponent implements OnInit {
    @Input('id') id!: string;
    @Input('policyId') policyId!: string;
    @Input('policyStatus') policyStatus!: string;
    @Input('static') static!: any;

    loading: boolean = true;
    socket: any;
    data: any;
    uiMetaData: any;
    buttons: any;
    commonVisible: boolean = true;
    enableIndividualFilters = false;
    readonly: boolean = false;
    private readonly _commentField: string = 'option.comment';

    private uiClassStateUserId: string | null = null;

    private readonly POLICY_BUTTONS_ACCEPTING: string = 'POLICY_BUTTONS_ACCEPTING';

    constructor(
        private policyEngineService: PolicyEngineService,
        private wsService: WebSocketService,
        private policyHelper: PolicyHelper,
        private dialogService: DialogService,
        private cdref: ChangeDetectorRef
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
        this.commonVisible = true;
        this.loading = true;
        if (this.static) {
            this.setData(this.static);
            setTimeout(() => {
                this.loading = false;
                this.cdref.detectChanges();
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
            this.uiMetaData = data.uiMetaData || {};
            this.enableIndividualFilters = this.uiMetaData.enableIndividualFilters;
            this.buttons = this.uiMetaData.buttons || [];

            this.uiClassStateUserId = this.extractUserId(data);
        } else {
            this.data = null;

            this.uiClassStateUserId = null;
        }

        if (!this.buttons) {
            return;
        }

        if (!this.enableIndividualFilters) {
            let visible = true;
            for (const button of this.buttons) {
                visible = visible && this.checkVisible(button);
            }
            for (const button of this.buttons) {
                button.visible = visible;
            }
        } else {
            for (const button of this.buttons) {
                button.visible = this.checkVisible(button);
            }
        }

        this.applyUiClassStateVisibilityV2();

        this.cdref.detectChanges();
    }

    isBtnVisible(button: any) {
        if (this.policyStatus === PolicyStatus.DISCONTINUED && button.hideWhenDiscontinued) {
            return false;
        }

        return true;
    }

    checkVisible(button: any) {
        let result = true;
        if (!this.data) {
            return result;
        }
        if (button.field) {
            result = this.getObjectValue(this.data, button.field) !== button.value;
        }
        if (!result) {
            return result;
        }
        if (!button.filters) {
            return result;
        }
        for (const filter of button.filters) {
            const fieldValue = this.getObjectValue(this.data, filter.field);
            switch (filter.type) {
                case 'equal':
                    result = result && (fieldValue == filter.value);
                    break;
                case 'not_equal':
                    result = result && (fieldValue != filter.value);
                    break;
                case 'in':
                    filter.value.split(',').forEach((val: any) => result = result && (val == fieldValue));
                    break;
                case 'not_in':
                    filter.value.split(',').forEach((val: any) => result = result && (val != fieldValue));
                    break;
            }
        }
        return result;
    }

    getObjectValue(data: any, value: any) {
        let result: any = null;
        if (data && value) {
            const keys = value.split('.');
            result = data;
            for (let i = 0; i < keys.length; i++) {
                const key = keys[i];
                if (key === 'L' && Array.isArray(result)) {
                    result = result[result.length - 1];
                } else {
                    result = result[key];
                }
            }
        }
        return result;
    }

    setObjectValue(data: any, field: any, value: any) {
        let result: any = null;
        if (data && field) {
            const keys = field.split('.');
            result = data;
            for (let i = 0; i < keys.length - 1; i++) {
                const key = keys[i];
                if (key === 'L' && Array.isArray(result)) {
                    result = result[result.length - 1];
                } else {
                    result = result[key];
                }
            }
            result[keys[keys.length - 1]] = value;
        }
        return result;
    }

    onSelect(button: any) {
        this.writeUiClassStateV2(button);

        this.setObjectValue(this.data, button.field, button.value);
        this.commonVisible = false;
        this.policyEngineService
            .setBlockData(this.id, this.policyId, {
                document: this.data,
                tag: button.tag,
            })
            .subscribe(
                () => { },
                (e) => {
                    console.error(e.error);
                    this.loading = false;
                    this.cdref.detectChanges();
                }
            );
    }

    onSelectDialog(button: any) {
        const dialogRef = this.dialogService.open(ConfirmationDialog, {
            header: button.title,
            width: '100vh',
            data: {
                title: button.title,
                description: button.description,
            },
        });

        dialogRef.onClose.subscribe((result) => {
            if (result) {
                let comments = this.getObjectValue(
                    this.data,
                    button.dialogResultFieldPath || this._commentField
                );
                if (Array.isArray(comments)) {
                    comments.push(result);
                } else {
                    comments = typeof comments === 'string'
                        ? [comments, result]
                        : [result];
                }
                this.setObjectValue(
                    this.data,
                    button.dialogResultFieldPath || this._commentField,
                    comments
                );
                this.onSelect(button);
            }
        });
    }

    private buildUiClassStateStorageKeyV2(): string | null {
        if (!this.policyId) {
            return null;
        }
        if (!this.uiClassStateUserId) {
            return null;
        }
        return this.POLICY_BUTTONS_ACCEPTING;
    }


    private extractUserId(blockData: any): string | null {
        if (!blockData) {
            return null;
        }

        const user = blockData.user;
        if (user && user.id) {
            return String(user.id);
        }
        if (user && user.did) {
            return String(user.did);
        }
        if (blockData.userId) {
            return String(blockData.userId);
        }
        if (blockData.userDid) {
            return String(blockData.userDid);
        }

        return null;
    }

    private parseCsv(value: any): string[] {
        if (typeof value !== 'string') {
            return [];
        }

        return value
            .split(',')
            .map((x) => String(x).trim())
            .filter((x) => {
                return !!x;
            });
    }

    private hasAnyUiClassStateConfigV2(): boolean {
        return (this.buttons || []).some((b: any) => {
            return (
                b &&
                (typeof b.uiClassStateRead === 'boolean' ||
                    typeof b.uiClassStateWrite === 'boolean' ||
                    typeof b.setVisibleButtons === 'string' ||
                    typeof b.uiClassStateDefaultVisible === 'boolean') // [ADDED]
            );
        });
    }

    private hasAnyUiClassStateReadV2(): boolean {
        return (this.buttons || []).some((b: any) => {
            return !!(b && b.uiClassStateRead === true);
        });
    }

    private applyUiClassStateVisibilityV2(): void {
        if (!this.hasAnyUiClassStateConfigV2()) {
            return;
        }

        if (!this.hasAnyUiClassStateReadV2()) {
            return;
        }

        const key = this.buildUiClassStateStorageKeyV2();
        if (!key) {
            return;
        }

        const raw = this.readUiClassStateValueV2();
        const allowed = this.parseCsv(raw);

        if (allowed.length === 0) {
            for (const button of this.buttons || []) {
                if (!button || button.uiClassStateRead !== true) {
                    continue;
                }

                const isDefault = button.uiClassStateDefaultVisible === true;
                button.visible = !!button.visible && isDefault;
            }
            return;
        }

        for (const button of this.buttons || []) {
            if (!button || button.uiClassStateRead !== true) {
                continue;
            }

            const name = button.name ? String(button.name).trim() : '';
            const tag = button.tag ? String(button.tag).trim() : '';

            const match = (name && allowed.includes(name)) || (tag && allowed.includes(tag));
            button.visible = !!button.visible && match;
        }
    }

    private writeUiClassStateV2(button: any): void {
        if (!this.hasAnyUiClassStateConfigV2()) {
            return;
        }

        const key = this.buildUiClassStateStorageKeyV2();
        if (!key) {
            return;
        }

        this.clearUiClassStateValueV2();

        if (!button || button.uiClassStateWrite !== true) {
            return;
        }

        const value = typeof button.setVisibleButtons === 'string'
            ? String(button.setVisibleButtons).trim()
            : '';

        if (value) {
            this.setUiClassStateValueV2(value);
        }
    }

    private readPolicyButtonsAcceptingStore(): Record<string, Record<string, string>> {
        const raw = localStorage.getItem(this.POLICY_BUTTONS_ACCEPTING);
        if (!raw) {
            return {};
        }

        try {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object') {
                return parsed as Record<string, Record<string, string>>;
            }
        } catch (_e) {
            //
        }

        return {};
    }

    private writePolicyButtonsAcceptingStore(store: Record<string, Record<string, string>>): void {
        const userIds = Object.keys(store);
        if (userIds.length === 0) {
            localStorage.removeItem(this.POLICY_BUTTONS_ACCEPTING);
            return;
        }

        localStorage.setItem(this.POLICY_BUTTONS_ACCEPTING, JSON.stringify(store));
    }

    private readUiClassStateValueV2(): string | null {
        if (!this.policyId) {
            return null;
        }
        if (!this.uiClassStateUserId) {
            return null;
        }

        const store = this.readPolicyButtonsAcceptingStore();
        const byUser = store[this.uiClassStateUserId];
        if (!byUser) {
            return null;
        }

        const value = byUser[this.policyId];
        if (typeof value !== 'string') {
            return null;
        }

        return value;
    }

    private clearUiClassStateValueV2(): void {
        if (!this.policyId) {
            return;
        }
        if (!this.uiClassStateUserId) {
            return;
        }

        const store = this.readPolicyButtonsAcceptingStore();
        const byUser = store[this.uiClassStateUserId];
        if (!byUser) {
            return;
        }

        if (Object.prototype.hasOwnProperty.call(byUser, this.policyId)) {
            delete byUser[this.policyId];
        }

        const policyIds = Object.keys(byUser);
        if (policyIds.length === 0) {
            delete store[this.uiClassStateUserId];
        }

        this.writePolicyButtonsAcceptingStore(store);
    }

    private setUiClassStateValueV2(value: string): void {
        if (!this.policyId) {
            return;
        }
        if (!this.uiClassStateUserId) {
            return;
        }

        const store = this.readPolicyButtonsAcceptingStore();

        if (!store[this.uiClassStateUserId]) {
            store[this.uiClassStateUserId] = {};
        }

        store[this.uiClassStateUserId][this.policyId] = value;

        this.writePolicyButtonsAcceptingStore(store);
    }
}
