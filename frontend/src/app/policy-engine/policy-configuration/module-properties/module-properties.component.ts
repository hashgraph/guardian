import { ChangeDetectorRef, Component, ElementRef, EventEmitter, Input, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import {
    PolicyModel,
    PolicyTokenModel,
    PolicyGroupModel,
    PolicyRoleModel,
    PolicyTopicModel,
    PolicyModuleModel,
    ModuleEventModel,
    ModuleVariableModel
} from '../../structures';

/**
 * Settings for module.
 */
@Component({
    selector: 'module-properties',
    templateUrl: './module-properties.component.html',
    styleUrls: ['./module-properties.component.css']
})
export class ModulePropertiesComponent implements OnInit {
    @Input('module') module!: any;
    @Input('readonly') readonly!: boolean;
    @Input('type') type!: string;
    @Input('errors') errors!: any[];

    @ViewChild('body') body?: ElementRef;

    propHidden: any = {
        main: false,
        variables: {},
        inputs: {},
        outputs: {},
    };

    variables: ModuleVariableModel[] = [];
    inputs: ModuleEventModel[] = [];
    outputs: ModuleEventModel[] = [];

    constructor(private changeDetector: ChangeDetectorRef) {
    }

    ngOnInit(): void {

    }

    ngOnChanges(changes: SimpleChanges) {
        this.inputs = this.module.inputEvents;
        this.outputs = this.module.outputEvents;
        this.variables = this.module.variables;
    }

    onHide(item: any, prop: any) {
        item[prop] = !item[prop];
    }


    addVariable() {
        this.module.createVariable();
    }

    onEditVariable(variable: ModuleVariableModel) {
        variable.emitUpdate();
    }

    onRemoveVariable(variable: ModuleVariableModel) {
        this.module.removeVariable(variable)
    }

    addInput() {
        this.module.createInputEvent();
    }

    onEditInput(input: ModuleEventModel) {
        input.emitUpdate();
    }

    onRemoveInput(input: ModuleEventModel) {
        this.module.removeInputEvent(input)
    }

    addOutput() {
        this.module.createOutputEvent();
    }

    onEditOutput(output: ModuleEventModel) {
        output.emitUpdate();
    }

    onRemoveOutput(output: ModuleEventModel) {
        this.module.removeOutputEvent(output)
    }
}
