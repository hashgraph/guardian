import { AfterContentInit, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { ComputeEngine } from "@cortex-js/compute-engine";
import { GenerateUUIDv4 } from '@guardian/interfaces';
import { MathLiveComponent } from 'src/app/modules/common/mathlive/mathlive.component';
import { Subscription, Observable } from 'rxjs';

class Formula {
    public type: 'function' | 'variable' = 'variable';

    public readonly id: string;

    public functionNameText: string = '';
    public functionBodyText: string = '';

    public functionName: string = '';
    public functionParams: string[] = [];
    public functionUnknowns: string[] = [];
    public validName: boolean = false;
    public validBody: boolean = false;

    public error: string = '';
    public empty: boolean = true;

    private bodyUnknowns: string[] = [];

    private subscriber: Function | null;

    public get valid(): boolean {
        return this.validName && this.validBody;
    }

    constructor() {
        this.id = GenerateUUIDv4();
        this.empty = true;
        const validator = ComputeEngine.getStandardLibrary().find((t) => !!t.At)?.At;
        if (validator) {
            validator.signature = "(value: list|tuple|string, indexes: ...(number | string)) -> unknown";
        }
    }

    private _setErrorName() {
        this.type = 'variable';
        this.functionName = '';
        this.functionParams = [];
        this.validName = false;
        this.error = 'Invalid name';
    }

    public updateName() {
        this.empty = false;
        try {
            const text = this.functionNameText.trim();
            const items = text.match(/\b\w+\b/g) || [];
            const fName = items[0];
            const fParams = items.slice(1);
            if (!fName) {
                this._setErrorName();
                return;
            }

            if (fParams.length === 0) {
                this.type = 'variable';
                this.functionName = fName;
                this.functionParams = [];
                this.validName = true;
                return;
            }

            if (!(text.includes('(') && text.includes(')'))) {
                this._setErrorName();
                return;
            }

            const latex = text.replace(/(\b\w+\b)/g, '\\operatorname{$1}') + ' := 0';
            const ce = new ComputeEngine();
            const f = ce.parse(latex);
            if (!f.isValid) {
                this._setErrorName();
                return;
            }

            const json = f.json as any;

            if (
                json.length !== 3 ||
                json[0] !== 'Assign' ||
                json[1] !== fName ||
                !Array.isArray(json[2])
            ) {
                this._setErrorName();
                return;
            }

            if (
                json[2].length !== (fParams.length + 2) ||
                json[2][0] !== 'Function'
            ) {
                this._setErrorName();
                return;
            }

            for (let i = 0; i < fParams.length; i++) {
                if (json[2][i + 2] !== fParams[i]) {
                    this._setErrorName();
                    return;
                }
            }

            this.type = 'function';
            this.functionName = fName;
            this.functionParams = fParams;
            this.validName = true;
        } catch (error) {
            this._setErrorName();
        }

        if (this.subscriber) {
            this.subscriber();
        }
    }

    public update() {
        this.empty = false;
        try {
            const ce = new ComputeEngine();
            const p = ce.parse(this.functionBodyText);
            this.bodyUnknowns = p.unknowns as string[];
            this.validBody = p.isValid;
            if (!this.validBody) {
                this.error = 'Invalid function';
            }
        } catch (error) {
            this.bodyUnknowns = [];
            this.validBody = false;
            this.error = 'Invalid function';
        }
        if (this.subscriber) {
            this.subscriber();
        }
    }

    public updateUnknowns() {
        const map = new Set<string>();
        if (this.functionParams) {
            for (const param of this.functionParams) {
                map.add(param);
            }
        }
        const list: string[] = [];
        if (this.bodyUnknowns) {
            for (const unknown of this.bodyUnknowns) {
                if (!map.has(unknown)) {
                    list.push(unknown);
                }
            }
        }
        this.functionUnknowns = list;
    }

    public subscribe(f: Function) {
        this.subscriber = f;
    }

    public destroy() {
        this.subscriber = null;
    }
}

class Link {
    public readonly type = 'link';

    public readonly id: string;
    public variableNameText: string = '';
    public validName: boolean = false;

    public error: string = '';
    public empty: boolean = true;

    private subscriber: Function | null;

    public get name(): string {
        return this.variableNameText;
    }

    public get valid(): boolean {
        return this.validName;
    }

    constructor() {
        this.id = GenerateUUIDv4();
        this.empty = true;
    }

    public update() {
        this.empty = false;
        try {


        } catch (error) {
            this.validName = false;
            this.error = 'Invalid name';
        }
        if (this.subscriber) {
            this.subscriber();
        }
    }

    public subscribe(f: Function) {
        this.subscriber = f;
    }

    public destroy() {
        this.subscriber = null;
    }
}

class Scope {
    public formulas: Formula[] = [];
    public variables: Link[] = [];
    public valid: boolean = false;

    private list: (Formula | Link)[] = [];

    public addFormula() {
        const formula = new Formula();
        formula.subscribe(this.onChange.bind(this));
        this.formulas.push(formula);
        this.update();
    }

    public addVariable() {
        const variable = new Link();
        variable.subscribe(this.onChange.bind(this));
        this.variables.push(variable);
        this.update();
    }

    public deleteFormula(formula: Formula) {
        this.formulas = this.formulas.filter((item) => item !== formula);
        formula.destroy();
        this.update();
    }

    public deleteVariable(variable: Link) {
        this.variables = this.variables.filter((item) => item !== variable);
        variable.destroy();
        this.update();
    }

    public update() {
        this.onChange();
    }

    private onChange() {
        this.valid = true;
        this.list = [];

        const variables = this.variables.filter((v) => !v.empty);
        const formulas = this.formulas.filter((f) => !f.empty);

        for (const variable of variables) {
            if (!variable.valid) {
                this.valid = false;
                this.list = [];
                return;
            }
        }

        for (const formula of formulas) {
            if (!formula.valid) {
                this.valid = false;
                this.list = [];
                return;
            }
        }

        // Variables
        const list = new Map<string, Formula | Link>();
        for (const variable of variables) {
            const old = list.get(variable.name);
            if (old) {
                old.validName = false;
                variable.validName = false;
                old.error = `Duplicate name`;
                variable.error = `Duplicate name`;
                this.valid = false;
                this.list = [];
                return;
            }
            list.set(variable.name, variable);
            this.list.push(variable);
        }

        // Formulas
        for (const formula of formulas) {
            const old = list.get(formula.functionName);
            if (old) {
                old.validName = false;
                formula.validName = false;
                old.error = `Duplicate name`;
                formula.error = `Duplicate name`;
                this.valid = false;
                this.list = [];
                return;
            }
        }

        const dependencies = new Map<string, Formula>();
        for (const formula of formulas) {
            formula.updateUnknowns();
            if (this.checkUnknowns(list, formula.functionUnknowns)) {
                list.set(formula.functionName, formula);
                this.list.push(formula);
            } else {
                dependencies.set(formula.functionName, formula);
            }
        }

        let lastSize = 0;
        while (dependencies.size > 0 && dependencies.size !== lastSize) {
            lastSize = dependencies.size;

            const formulas = dependencies.values();
            for (const formula of formulas) {
                if (this.checkUnknowns(list, formula.functionUnknowns)) {
                    list.set(formula.functionName, formula);
                    this.list.push(formula);
                    dependencies.delete(formula.functionName);
                }
            }
        }

        if (dependencies.size > 0) {
            const formulas = dependencies.values();
            for (const formula of formulas) {
                formula.validBody = false;
                for (const unknown of formula.functionUnknowns) {
                    if (!list.has(unknown)) {
                        if (!dependencies.has(unknown)) {
                            formula.error = `Unknown variable: ${unknown}`;
                        } else {
                            formula.error = `Cyclic dependence: ${unknown}`;
                        }
                    }
                }
            }
            this.valid = false;
            this.list = [];
            return;
        }
    }

    private checkUnknowns(list: Map<string, Formula | Link>, unknowns: string[]): boolean {
        if (unknowns.length === 0) {
            return true;
        }
        for (const unknown of unknowns) {
            if (!list.has(unknown)) {
                return false;
            }
        }
        return true;
    }
}








/**
 * Dialog.
 */
@Component({
    selector: 'math-editor-dialog',
    templateUrl: './math-editor-dialog.component.html',
    styleUrls: ['./math-editor-dialog.component.scss']
})
export class MathEditorDialogComponent implements OnInit, AfterContentInit {
    @ViewChild('contextBody', { static: true }) contextBodyRef: ElementRef;

    public expression!: string;
    public initDialog = false;
    public loading = true;
    public data: any;
    public test = false;
    public block: any;

    public scope: Scope;

    public keyboard: boolean = false;

    constructor(
        private dialogRef: DynamicDialogRef,
        private config: DynamicDialogConfig,
    ) {
        this.data = this.config.data;
        this.scope = new Scope();

        this.scope.addFormula();
    }

    ngOnInit() {
        this.initDialog = false;
        this.loading = true;
        this.expression = this.data.expression;
        this.test = this.data.test;
        this.block = this.data.block;
    }

    ngAfterContentInit() {
        setTimeout(() => {
            this.initDialog = true;
            setTimeout(() => {
                this.loading = false;
            }, 1000);
        }, 100);
    }

    public onSave(): void {
        this.dialogRef.close({
            type: 'save',
            expression: this.expression
        });
    }

    public onTest(): void {
        this.dialogRef.close({
            type: 'test',
            expression: this.expression
        });
    }

    public onClose(): void {
        this.dialogRef.close(null);
    }

    public onKeyboard($event: boolean) {
        this.keyboard = $event;
    }

    public onKeyboardFocus($event: MathLiveComponent) {
        // setTimeout(() => {
        //     if (this.keyboard) {
        //         const focus = $event.getElement();
        //         const scroll = this.contextBodyRef;
        //         const targetRect = focus.nativeElement.getBoundingClientRect();
        //         const scrollRect = scroll.nativeElement.getBoundingClientRect();
        //         const y = targetRect.y - scrollRect.y;
        //         const height = scrollRect.height;
        //         const d = y - height + 60;
        //         if (d > 0) {
        //             scroll.nativeElement.scrollTop += d;
        //         }
        //     }
        // });
    }

    public deleteFormula(formula: Formula) {
        this.scope.deleteFormula(formula);
    }

    public addFormula() {
        this.scope.addFormula();
    }
}
