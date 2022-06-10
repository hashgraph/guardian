import {
    Component,
    Input,
    OnInit,
    SimpleChanges,
    EventEmitter,
    Output
} from '@angular/core';
import {
    FormBuilder,
    FormControl,
    FormGroup,
} from '@angular/forms';

/**
 * Schemas constructor
 */
@Component({
    selector: 'schema-field-configuration',
    templateUrl: './schema-field-configuration.component.html',
    styleUrls: ['./schema-field-configuration.component.css'],
})
export class SchemaFieldConfigurationComponent implements OnInit {
    @Input('form') form!: FormGroup;
    @Input('field') field!: {
        name: string;
        fieldName: string;
        fieldType: string;
        fieldRequired: string;
        fieldArray: string;
        controlName: FormControl;
        controlType: FormControl;
        controlRequired: FormControl;
        controlArray: FormControl;
        required: boolean;
        isArray: boolean;
        controlUnit: FormControl
    };

    @Input('types') types!: any[];
    @Input('measureTypes') measureTypes!: any[];
    @Input('schemaTypes') schemaTypes!: any[];

    @Output('remove') remove = new EventEmitter<any>();

    unit: boolean = true;

    constructor(private fb: FormBuilder) {

    }

    ngOnInit(): void {

    }

    ngOnChanges(changes: SimpleChanges): void {
        debugger
        const type = this.field.controlType.value;
        this.onTypeChange(type);
    }

    ngOnDestroy() {
    }

    onRemove(field: any) {
        this.remove.emit(field);
    }

    onTypeChange(event: any) {
        const item = this.types.find(e => e.value == event);
        if (item && item.name == 'Boolean') {
            this.field.controlArray.setValue(false);
            this.field.controlArray.disable();
        } else {
            this.field.controlArray.enable();
        }
        this.unit = event == 'measures' || event == 'currency';
    }
}
