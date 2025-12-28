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

    private hideEventsUserId: string | '' = '';

    private readonly HIDE_EVENTS_STORAGE_KEY: string = 'POLICY_HIDE_EVENTS';

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

            this.hideEventsUserId = data.userDid
            ;
        } else {
            this.data = null;

            this.hideEventsUserId = '';
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

        this.applyIncomingHideEventsVisibility();

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
        this.writeOutgoingHideEventsState(button);

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

    private clearHideEventsValue(store: Record<string, Record<string, string>>): void {
        const byUser = store[this.hideEventsUserId];
        if (!byUser) {
            return;
        }

        if ( byUser[this.policyId]) {
            delete byUser[this.policyId];
        }

        const policyIds = Object.keys(byUser);
        if (!policyIds.length) {
            delete store[this.hideEventsUserId];
        }

        console.log('store', store)

        const userIds = Object.keys(store);
        if (!userIds.length) {
            localStorage.removeItem(this.HIDE_EVENTS_STORAGE_KEY);
        }
    }

    private readHideEventsStore(): Record<string, Record<string, string>> {
        const raw = localStorage.getItem(this.HIDE_EVENTS_STORAGE_KEY);
        if (!raw) {
            return {};
        }

        try {
            const parsed = JSON.parse(raw);
            if (typeof parsed === 'object') {
                return parsed;
            }
        } catch (_e) {
            //
        }

        return {};
    }

    private writeOutgoingHideEventsState(button: any): void {
        if (!this.policyId) {
            return;
        }
        if (!this.hideEventsUserId) {
            return;
        }

        const store = this.readHideEventsStore();

        this.clearHideEventsValue(store);

        const value = button.visibleButtons

        if (button.outgoingHideEventsEnabled && value) {
            if (!store[this.hideEventsUserId]) {
                store[this.hideEventsUserId] = {};
            }

            store[this.hideEventsUserId][this.policyId] = value;
        }

        localStorage.setItem(this.HIDE_EVENTS_STORAGE_KEY, JSON.stringify(store));
    }

    private readHideEventsValue(): string {
        const store = this.readHideEventsStore();
        const byUser = store[this.hideEventsUserId];
        if (!byUser) {
            return '';
        }

        return byUser[this.policyId] ?? '';
    }

    private applyIncomingHideEventsVisibility(): void {
        if (!this.policyId) {
            return;
        }

        if (!this.hideEventsUserId) {
            return;
        }

        const isAnyIncomingHideEventsEnabled = (this.buttons || []).some((b: any) => b?.incomingHideEventsEnabled);

        if (!isAnyIncomingHideEventsEnabled) {
            return;
        }

        const stored = this.readHideEventsValue();

        const allowedButtons = stored.split(',').map((x) => x.trim()).filter((x) => x);
        for (const button of this.buttons || []) {
            if (!button?.incomingHideEventsEnabled) {
                continue;
            }

            if (!allowedButtons.length) {
                button.visible = false;
                continue;
            }

            const name = button.name;
            const tag = button.tag;

            const match = name && allowedButtons.includes(name) || tag && allowedButtons.includes(tag);

            button.visible = button.visible && match;
        }
    }
}
