import {
    AfterContentChecked,
    AfterViewInit,
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    Input,
    OnInit,
} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { PolicyHelper } from 'src/app/services/policy-helper.service';
import { WebSocketService } from 'src/app/services/web-socket.service';
import { ConfirmationDialog } from '../confirmation-dialog/confirmation-dialog.component';
import { DialogService } from 'primeng/dynamicdialog';

/**
 * Component for display block of 'Buttons' type.
 */
@Component({
    selector: 'button-block',
    templateUrl: './button-block.component.html',
    styleUrls: ['./button-block.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ButtonBlockComponent implements OnInit, AfterContentChecked {
    @Input('id') id!: string;
    @Input('policyId') policyId!: string;
    @Input('static') static!: any;

    loading: boolean = true;
    socket: any;
    data: any;
    uiMetaData: any;
    buttons: any;
    commonVisible: boolean = true;
    enableIndividualFilters = false;
    private readonly _commentField: string = 'option.comment';

    constructor(
        private policyEngineService: PolicyEngineService,
        private wsService: WebSocketService,
        private policyHelper: PolicyHelper,
        public dialog: MatDialog,
        private dialogService: DialogService,
        private cdref: ChangeDetectorRef
    ) {
    }

    ngAfterContentChecked(): void {
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
        this.cdref.detectChanges();
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
            }, 500);
        } else {
            this.policyEngineService
                .getBlockData(this.id, this.policyId)
                .subscribe(
                    (data: any) => {
                        this.setData(data);
                        setTimeout(() => {
                            this.loading = false;
                        }, 1000);
                    },
                    (e) => {
                        console.error(e.error);
                        this.loading = false;
                    }
                );
        }
    }

    setData(data: any) {
        if (data) {
            this.data = data.data;
            this.uiMetaData = data.uiMetaData || {};
            this.enableIndividualFilters = this.uiMetaData.enableIndividualFilters;
            this.buttons = this.uiMetaData.buttons || [];
        } else {
            this.data = null;
        }
    }

    checkVisible(button: any) {
        let result = true;
        if (!this.data) {
            return result;
        }
        if (button.field) {
            result =
                this.getObjectValue(this.data, button.field) !== button.value;
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
                    result = result && fieldValue == filter.value;
                    break;
                case 'not_equal':
                    result = result && fieldValue != filter.value;
                    break;
                case 'in':
                    filter.value
                        .split(',')
                        .forEach(
                            (val: any) => (result = result && val == fieldValue)
                        );
                    break;
                case 'not_in':
                    filter.value
                        .split(',')
                        .forEach(
                            (val: any) => (result = result && val != fieldValue)
                        );
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
        this.setObjectValue(this.data, button.field, button.value);
        this.commonVisible = false;
        this.policyEngineService
            .setBlockData(this.id, this.policyId, {
                document: this.data,
                tag: button.tag,
            })
            .subscribe(
                () => {},
                (e) => {
                    console.error(e.error);
                    this.loading = false;
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
                    comments =
                        typeof comments === 'string'
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
}
