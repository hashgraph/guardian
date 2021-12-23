import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, ValidatorFn, Validators } from '@angular/forms';
import { Schema, SchemaField } from 'interfaces';
import * as moment from 'moment';

/**
 * Form built by schema
 */
@Component({
    selector: 'app-schema-form',
    templateUrl: './schema-form.component.html',
    styleUrls: ['./schema-form.component.css']
})
export class SchemaFormComponent implements OnInit {
    @Input('private-fields') hide!: { [x: string]: boolean };
    @Input('schema') schema!: Schema;
    @Input('fields') schemaFields!: SchemaField[];
    @Input('context') context!: any;
    @Input('formGroup') group!: FormGroup;
    @Input('delimiter-hide') delimiterHide: boolean = false;

    options: FormGroup | undefined;
    fields: any[] | undefined = [];

    @Output('change') change = new EventEmitter<Schema | null>();

    constructor(private fb: FormBuilder) {
    }


    ngOnInit(): void {
    }

    ngOnChanges() {
        this.hide = this.hide || {};
        if (this.schemaFields) {
            this.update(this.schemaFields);
            return;
        } else if (this.schema) {
            this.context = this.schema.context;
            this.update(this.schema.fields);
            return;
        }
        this.update();
    }

    addItem(item: any) {
        const listItem: any = {
            name: item.name,
            index: String(item.list.length),
        }
        if (item.isRef) {
            listItem.control = new FormGroup({});
        } else {
            let validators = this.getValidators(item);
            listItem.control = new FormControl("", validators);
        }
        item.list.push(listItem);
        item.control.push(listItem.control);
        this.options?.updateValueAndValidity();
        this.change.emit();
    }

    addGroup(item: any) {
        item.control = new FormGroup({});
        setTimeout(() => {
            this.options?.addControl(item.d, item.control);
            this.change.emit();
        });
    }

    removeGroup(item: any) {
        this.options?.removeControl(item.name);
        this.options?.updateValueAndValidity();
        item.control = null;
        this.change.emit();
    }

    onRemove(item: any, listItem: any) {
        const index = item.list.indexOf(listItem);
        item.control.removeAt(index);
        item.list.splice(index, 1);
        for (let index = 0; index < item.list.length; index++) {
            const element = item.list[index];
            element.index = String(index);
        }
        this.options?.updateValueAndValidity();
        this.change.emit();
    }

    update(schemaFields?: SchemaField[]) {
        if (!schemaFields) {
            return;
        }

        const group: any = {};
        const fields: any[] = [];
        for (let i = 0; i < schemaFields.length; i++) {
            const field = schemaFields[i];
            if(this.hide[field.name]) {
                continue
            }
            const item: any = {
                name: field.name,
                description: field.description,
                required: field.required,
                isArray: field.isArray,
                isRef: field.isRef,
                hide: false,
                context: field.context,
                type: field.type,
                format: field.format,
                pattern: field.pattern
            }
            if (!field.isArray && !field.isRef) {
                let validators = this.getValidators(item);
                item.control = new FormControl("", validators);
                group[field.name] = item.control;
            }
            if (!field.isArray && field.isRef) {
                item.fields = field.fields;
                if (field.required) {
                    item.control = new FormGroup({});
                    group[field.name] = item.control;
                }
            }
            if (field.isArray && !field.isRef) {
                item.control = new FormArray([]);
                group[field.name] = item.control;
                item.list = [];
                if (field.required) {
                    this.addItem(item);
                }
            }
            if (field.isArray && field.isRef) {
                item.control = new FormArray([]);
                group[field.name] = item.control;
                item.list = [];
                item.fields = field.fields;
                if (field.required) {
                    this.addItem(item);
                }
            }
            fields.push(item);
        }
        this.fields = fields;

        this.options = this.group;
        const keys = Object.keys(group);
        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            this.options.addControl(key, group[key]);
        }
        if (this.context) {
            this.options.addControl("type", new FormControl(this.context.type));
            this.options.addControl("@context", new FormControl(this.context.context));
        }
    }

    onDateFieldChange(
      control: FormControl | null,
      group: FormGroup | null,
      controlName: string | null,
      prepareDate: boolean
    ): void {
      let groupControl = control;

      if (group && controlName)
      {
        groupControl = group.get(controlName) as FormControl;
      }

      if (!groupControl)
      {
        return;
      }

      let momentDate = moment(groupControl.value);

      if (!momentDate.isValid())
      {
        return;
      }

      let formatDate =  prepareDate
       ? momentDate.format("YYYY-MM-DD")
       : momentDate.toISOString();

      groupControl.setValue(formatDate,
      {
        onlySelf: true,
        emitEvent: false,
        emitModelToViewChange: false,
        emitViewToModelChange: false
      });
    }

    private getValidators(item:any): ValidatorFn[] {
      const validators = [];

      if (item.required)
      {
        validators.push(Validators.required);
      }

      if (item.pattern)
      {
        validators.push(Validators.pattern(item.pattern));
        return validators;
      }

      if (item.format === 'email')
      {
        validators.push(Validators.pattern(/^\w+@[a-zA-Z_]+?\.[a-zA-Z]{2,3}$/));
      }

      if (item.type === 'number')
      {
        validators.push(Validators.pattern(/^-?\d*(\.\d+)?$/));
      }

      if (item.format === 'duration')
      {
        validators.push(Validators.pattern(/^[0-9]+$/));
      }

      if (item.type === 'integer')
      {
        validators.push(Validators.pattern(/^-?\d*$/));
      }

      if (item.format === 'url')
      {
        validators.push(Validators.pattern(/^(http:\/\/www\.|https:\/\/www\.|http:\/\/|https:\/\/)?[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,5}(:[0-9]{1,5})?(\/.*)?$/));
      }

      return validators;
    }
}
