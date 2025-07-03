import {Component, EventEmitter, Input, OnInit, Output, SimpleChanges, ViewEncapsulation} from '@angular/core';
import {CodeEditorDialogComponent} from '../../../../dialogs/code-editor-dialog/code-editor-dialog.component';
import {IModuleVariables, PolicyBlock} from '../../../../structures';
import {DialogService} from 'primeng/dynamicdialog';
import { CustomConfirmDialogComponent } from 'src/app/modules/common/custom-confirm-dialog/custom-confirm-dialog.component';

/**
 * Settings for block of 'switch' and 'interfaceStepBlock' types.
 */
@Component({
    selector: 'http-request-config',
    templateUrl: './http-request-config.component.html',
    styleUrls: ['./http-request-config.component.scss'],
    encapsulation: ViewEncapsulation.Emulated
})
export class HttpRequestConfigComponent implements OnInit {
    @Input('block') currentBlock!: PolicyBlock;
    @Input('readonly') readonly!: boolean;
    @Output() onInit = new EventEmitter();

    private moduleVariables!: IModuleVariables | null;
    private item!: PolicyBlock;

    propHidden: any = {
        main: false,
        options: false,
        conditionsGroup: false,
        conditions: {},
    };

    properties!: any;

    public httpMethodsOptions = [
        {label: 'GET', value: 'GET'},
        {label: 'POST', value: 'POST'},
        {label: 'PUT', value: 'PUT'},
        {label: 'PATCH', value: 'PATCH'},
        {label: 'DELETE', value: 'DELETE'}
    ];

    constructor(
        private dialog: DialogService,
    ) {
    }

    ngOnInit(): void {
        this.onInit.emit(this);
        this.load(this.currentBlock);
    }

    ngOnChanges(changes: SimpleChanges) {
        this.load(this.currentBlock);
    }

    load(block: PolicyBlock) {
        this.moduleVariables = block.moduleVariables;
        this.item = block;
        this.properties = block.properties;
        this.properties.headers = this.properties.headers || [];
    }

    onHide(item: any, prop: any) {
        item[prop] = !item[prop];
    }

    addHeader() {
        this.properties.headers.push({
            tag: `Condition_${this.properties.headers.length}`,
            type: 'equal',
            value: '',
            actor: '',
            included: false,
        })
    }

    onRemoveHeader(i: number) {
        this.properties.headers.splice(i, 1);
    }

    editBody($event: MouseEvent) {
        const dialogRef = this.dialog.open(CodeEditorDialogComponent, {
            showHeader: false,
            width: '80%',
            styleClass: 'guardian-dialog',
            data: {
                mode: 'json',
                expression: this.properties.messageBody,
                readonly: this.readonly
            }
        })
        dialogRef.onClose.subscribe(result => {
            if (result) {
                this.properties.messageBody = result.expression;
            }
        })
    }

    onSave() {
        this.item.changed = true;
        this.item.emitUpdate()
    }

    onIncludeChange(header: any) {
        if (header.included) {
            const dialogRef = this.dialog.open(CustomConfirmDialogComponent, {
                showHeader: false,
                width: '640px',
                styleClass: 'http-confirm-dialog',
                data: {
                    header: 'Include HTTP[S] request header value in Exported Policy?',
                    text:   'HTTP[S] request header values may contain sensitive information. ' +
                        'Are you sure you want to include the value of this header ' +
                        'in the exported policy artifact?',
                    buttons: [
                        { name: 'No',  class: 'secondary' },
                        { name: 'Yes', class: 'primary'   }
                    ]
                }
            });

            dialogRef.onClose.subscribe(result => {
                if (!result) {
                    header.included = false;
                }
                this.onSave();
            });
        } else {
            this.onSave();
        }
    }
}
