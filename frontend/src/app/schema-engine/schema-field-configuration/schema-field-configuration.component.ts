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
import { UnitSystem } from '@guardian/interfaces';
import { FieldControl } from "../field-control";

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
    @Input('field') field!: FieldControl;

    @Input('types') types!: any[];
    @Input('measureTypes') measureTypes!: any[];
    @Input('schemaTypes') schemaTypes!: any[];
    @Input('extended') extended!: boolean;

    @Output('remove') remove = new EventEmitter<any>();

    unit: boolean = true;

    constructor(private fb: FormBuilder) {

    }

    ngOnInit(): void {

    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes.extended && Object.keys(changes).length === 1) {
            return;
        } 
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
        this.unit = event == UnitSystem.Prefix || event == UnitSystem.Postfix;
    }
}
