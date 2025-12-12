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
    }

    onHide(item: any, prop: any) {
        item[prop] = !item[prop];
    }

    onSave() {
        this.item.changed = true;
    }

    public test(item: any) {
        console.log(1);
        debugger;
        const validator = ComputeEngine.getStandardLibrary().find((t) => !!t.At)?.At;
        if (validator) {
            validator.signature = "(value: list|tuple|string, indexes: ...(number | string)) -> unknown";
        }

        const ce = new ComputeEngine();
        ce.assign('double1', ce.parse(`(y) \\mapsto 2y `));
        ce.parse('\\operatorname{double2}(x) := 2x').evaluate();

        ce.parse('\\operatorname{double1}(3)').evaluate().print();
        ce.parse('\\operatorname{double2}(3)').evaluate().print();
        debugger;


        // debugger;
        // const value: string = item.value;
        // ce.assign('x', ce.box(['List', ce.box(['List', 10, 20]), ce.box(['List', 30, 40])]));
        // ce.assign('km', ce.box(['Number', '2']));
        // ce.assign('mm', ce.box(['Number', '2']));
        // const p = ce.parse(value);
        // const u = p.unknowns;
        // const v = p.isValid;
        // const e = p.errors;
        // const s = p.toString();
        // const ev = ce.parse('\\sum_{i=0}^{n}x_{i}').evaluate().print();
        // debugger;
        // ce.parse(`\\sum_{k=1}^{\\operatorname{\\mathrm{km}}}\\sum_{m=1}^{\\operatorname{\\mathrm{mm}}}\\left(x_{k,m}\\right)`).evaluate().print()
    }

    public editExpression($event: MouseEvent) {
        const dialogRef = this.dialog.open(MathEditorDialogComponent, {
            showHeader: false,
            width: '80%',
            styleClass: 'guardian-dialog',
            data: {
                test: true,
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
