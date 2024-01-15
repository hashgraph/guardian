import { ChangeDetectorRef, Component, ElementRef, Input, OnInit, SimpleChanges, ViewChild } from '@angular/core';
import { ModuleEvent, ModuleVariable, PolicyModule, SchemaVariables } from '../../structures';

/**
 * Settings for module.
 */
@Component({
    selector: 'module-properties',
    templateUrl: './module-properties.component.html',
    styleUrls: ['./module-properties.component.scss']
})
export class ModulePropertiesComponent implements OnInit {
    @Input('module') module!: any;
    @Input('readonly') readonly!: boolean;
    @Input('type') type!: string;
    @Input('errors') errors!: any[];

    @ViewChild('body') body?: ElementRef;

    public propHidden: any = {
        main: false,
        variables: {},
        inputs: {},
        outputs: {},
    };

    public baseSchemas: SchemaVariables[];

    public variables: ModuleVariable[] = [];
    public inputs: ModuleEvent[] = [];
    public outputs: ModuleEvent[] = [];

    constructor() {
    }

    ngOnInit(): void {
    }

    ngOnChanges(changes: SimpleChanges) {
        this.inputs = this.module.inputEvents;
        this.outputs = this.module.outputEvents;
        this.variables = this.module.variables;
        const baseSchemas: any[] = this.module.getSchemas() || [];
        this.baseSchemas = baseSchemas.map(s => new SchemaVariables(s));
    }

    onHide(item: any, prop: any) {
        item[prop] = !item[prop];
    }


    addVariable() {
        this.module.createVariable();
    }

    onEditVariable(variable: ModuleVariable) {
        variable.changed = true;
        variable.emitUpdate();
    }

    onRemoveVariable(variable: ModuleVariable) {
        this.module.removeVariable(variable)
    }

    addInput() {
        this.module.createInputEvent();
    }

    onEditInput(input: ModuleEvent) {
        input.changed = true;
        input.emitUpdate();
    }

    onRemoveInput(input: ModuleEvent) {
        this.module.removeInputEvent(input)
    }

    addOutput() {
        this.module.createOutputEvent();
    }

    onEditOutput(output: ModuleEvent) {
        output.changed = true;
        output.emitUpdate();
    }

    onRemoveOutput(output: ModuleEvent) {
        this.module.removeOutputEvent(output)
    }

    baseSchemaReadOnly(baseSchema: string | unknown): boolean {
        return typeof baseSchema === 'object';
    }
}
