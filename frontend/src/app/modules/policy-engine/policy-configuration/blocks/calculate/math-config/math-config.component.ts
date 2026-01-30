import { Component, EventEmitter, Inject, Input, OnInit, Output, SimpleChanges, ViewEncapsulation } from '@angular/core';
import { IModuleVariables, PolicyBlock, SchemaVariables } from '../../../../structures';
import { ComputeEngine } from "@cortex-js/compute-engine";
import { DialogService } from 'primeng/dynamicdialog';
import { MathEditorDialogComponent } from 'src/app/modules/policy-engine/dialogs/math-editor-dialog/math-editor-dialog.component';

/**
 * Settings for block of 'policyRolesBlock' type.
 */
@Component({
    selector: 'math-config',
    templateUrl: './math-config.component.html',
    styleUrls: ['./math-config.component.scss'],
    encapsulation: ViewEncapsulation.Emulated
})
export class MathConfigComponent implements OnInit {
    @Input('block') currentBlock!: PolicyBlock;
    @Input('readonly') readonly!: boolean;
    @Output() onInit = new EventEmitter();

    private moduleVariables!: IModuleVariables | null;
    private item!: PolicyBlock;
    private policyId!: string | undefined;

    propHidden: any = {
    };

    properties!: any;
    schemas!: SchemaVariables[];

    constructor(
        private dialog: DialogService,
    ) {

    }

    ngOnInit(): void {
        this.schemas = [];
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
        this.schemas = this.moduleVariables?.schemas || [];
        this.policyId = block.policyId;
    }

    onHide(item: any, prop: any) {
        item[prop] = !item[prop];
    }

    onSave() {
        this.item.changed = true;
    }

    public editExpression($event: MouseEvent) {
        const dialogRef = this.dialog.open(MathEditorDialogComponent, {
            showHeader: false,
            width: '80%',
            styleClass: 'guardian-dialog',
            data: {
                test: true,
                policyId: this.policyId,
                block: this.currentBlock,
                schemas: this.schemas,
                expression: this.properties.expression,
                readonly: this.readonly
            }
        })
        dialogRef.onClose.subscribe(result => {
            if (result) {
                this.properties.expression = result.expression;
                this.onSave();
            }
        })
    }
}
