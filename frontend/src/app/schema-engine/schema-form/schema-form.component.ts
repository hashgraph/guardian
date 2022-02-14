import { NgxMatDateAdapter, NGX_MAT_DATE_FORMATS } from '@angular-material-components/datetime-picker';
import { NgxMatMomentAdapter } from '@angular-material-components/moment-adapter';
import { ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { AbstractControl, FormArray, FormControl, FormGroup, ValidatorFn, Validators } from '@angular/forms';
import { Schema, SchemaField } from 'interfaces';
import * as moment from 'moment';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { API_IPFS_GATEWAY_URL } from 'src/app/services/api';
import { IPFSService } from 'src/app/services/ipfs.service';

export const DATETIME_FORMATS = {
  parse: {
    dateInput: 'l, LT',
  },
  display: {
    dateInput: 'l, LT',
    monthYearLabel: 'MM yyyy',
    dateA11yLabel: 'LL',
    monthYearA11yLabel: 'MMMM YYYY',
  }
};

enum PlaceholderByFieldType {
  Email = "example@email.com",
  Number = "123",
  URL = "example.com",
  String = "example string",
  IPFS = 'ipfs.io/ipfs/example-hash'
}

enum ErrorFieldMessageByFieldType {
  Email = "Please make sure the field contain a valid email address",
  Number = "Please make sure the field contain a valid number value",
  Duration = "Please make sure the field contain a valid duration value",
  Integer = "Please make sure the field contain a valid integer value",
  URL = "Please make sure the field contain a valid URL value",
  DateTime = "Please make sure the field contain a valid datetime value",
  Date = "Please make sure the field contain a valid date value",
  Other = "Please make sure the field contain a valid value"
};

enum ErrorArrayMessageByFieldType {
  Email = "Please make sure all fields contain a valid email address",
  Number = "Please make sure all fields contain a valid number value",
  Duration = "Please make sure all fields contain a valid duration value",
  Integer = "Please make sure all fields contain a valid integer value",
  URL = "Please make sure all fields contain a valid URL value",
  DateTime = "Please make sure all fields contain a valid datetime value",
  Date = "Please make sure all fields contain a valid date value",
  Other = "Please make sure all fields contain a valid value"
};

/**
 * Form built by schema
 */
@Component({
  selector: 'app-schema-form',
  templateUrl: './schema-form.component.html',
  styleUrls: ['./schema-form.component.css'],
  providers: [
    { provide: NgxMatDateAdapter, useClass: NgxMatMomentAdapter },
    { provide: NGX_MAT_DATE_FORMATS, useValue: DATETIME_FORMATS }
  ]
})
export class SchemaFormComponent implements OnInit {
  @Input('private-fields') hide!: { [x: string]: boolean };
  @Input('schema') schema!: Schema;
  @Input('fields') schemaFields!: SchemaField[];
  @Input('context') context!: {
    type: any;
    context: any;
  };
  @Input('formGroup') group!: FormGroup;
  @Input('delimiter-hide') delimiterHide: boolean = false;

  options: FormGroup | undefined;
  fields: any[] | undefined = [];

  @Output('change') change = new EventEmitter<Schema | null>();
  destroy$: Subject<boolean> = new Subject<boolean>();

  constructor(
    private ipfs: IPFSService,
    protected changeDetectorRef: ChangeDetectorRef
  ) { }


  ngOnInit(): void {
  }

  ngOnChanges() {
    this.hide = this.hide || {};
    if (this.schemaFields) {
      this.update(this.schemaFields);
      return;
    } else if (this.schema) {
      this.context = {
        type: this.schema.type,
        context: [this.schema.contextURL]
      };
      this.update(this.schema.fields);
      return;
    }
    this.update();
  }

  addItem(item: any, immediateAddForm: boolean = false) {
    const listItem: any = {
      name: item.name,
      index: String(item.list.length),
    }
    if (item.isRef) {
      listItem.control = new FormGroup({});
    } else {
      listItem.fileUploading = false;
      let validators = this.getValidators(item);
      listItem.control = new FormControl("", validators);

      if (['date', 'date-time'].includes(item.format)) {
        this.subscribeFormatDateValue(listItem.control, item.format);
      }
      if (['number', 'integer', 'duration'].includes(item.type)) {
        this.subscribeFormatNumberValue(item.control, item.type);
      }
    }
    item.list.push(listItem);

    if (immediateAddForm) {
      item.control.push(listItem.control);
      this.options?.updateValueAndValidity();
      this.change.emit();
      return;
    }

    setTimeout(() => {
      item.control.push(listItem.control);
      this.options?.updateValueAndValidity();
      this.change.emit();
    });
  }

  addGroup(item: any) {
    item.control = new FormGroup({});
    this.options?.addControl(item.name, item.control);
    this.change.emit();
    this.changeDetectorRef.detectChanges();
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
      if (this.hide[field.name]) {
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
        item.fileUploading = false;
        let validators = this.getValidators(item);
        item.control = new FormControl("", validators);

        if (['date', 'date-time'].includes(item.format)) {
          this.subscribeFormatDateValue(item.control, item.format);
        }
        if (['number', 'integer', 'duration'].includes(item.type)) {
          this.subscribeFormatNumberValue(item.control, item.type);
        }

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
          this.addItem(item, true);
        }
      }
      if (field.isArray && field.isRef) {
        item.control = new FormArray([]);
        group[field.name] = item.control;
        item.list = [];
        item.fields = field.fields;
        if (field.required) {
          this.addItem(item, true);
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
    this.changeDetectorRef.detectChanges();
  }

  onFileSelected(event: any, control: AbstractControl, item: any) {
    control.patchValue("");
    const file = event?.target?.files[0];

    if (!file) {
      return;
    }
    item.fileUploading = true;
    this.ipfs.addFile(file)
      .subscribe(res => {
        control.patchValue(API_IPFS_GATEWAY_URL + res);
        item.fileUploading = false;
      }, error => {
        item.fileUploading = false;
      });
  }

  GetInvalidMessageByFieldType(type: string, isArray: boolean = false): string {
    if (!type) {
      return "";
    }

    const messages = isArray
      ? ErrorArrayMessageByFieldType
      : ErrorFieldMessageByFieldType;

    switch (type) {
      case 'email':
        return messages.Email;
      case 'number':
        return messages.Number;
      case 'duration':
        return messages.Duration;
      case 'integer':
        return messages.Integer;
      case 'url':
        return messages.URL;
      case 'date-time':
        return messages.DateTime;
      case 'date':
        return messages.Date;
      default:
        return messages.Other;
    }
  }

  GetPlaceholderByFieldType(type: string, pattern: string= ""): string {
    switch (type) {
      case 'email':
        return PlaceholderByFieldType.Email;
      case 'number':
        return PlaceholderByFieldType.Number;
      case 'duration':
        return PlaceholderByFieldType.Number;
      case 'integer':
        return PlaceholderByFieldType.Number;
      case 'url':
        if (pattern === '^((https):\/\/)?ipfs.io\/ipfs\/.+')
        {
          return PlaceholderByFieldType.IPFS;
        }
        return PlaceholderByFieldType.URL;
      case 'string':
        return PlaceholderByFieldType.String;
      default:
        return "";
    }
  }

  private subscribeFormatDateValue(control: FormControl, format: string) {
    if (format === 'date') {
      control.valueChanges
        .pipe(takeUntil(this.destroy$))
        .subscribe((val: any) => {
          let momentDate = moment(val);
          let valueToSet = "";
          if (momentDate.isValid()) {
            valueToSet = momentDate.format("YYYY-MM-DD");
          }

          control.setValue(valueToSet,
            {
              emitEvent: false,
              emitModelToViewChange: false
            });
        });
    }

    if (format === 'date-time') {
      control.valueChanges
        .pipe(takeUntil(this.destroy$))
        .subscribe((val: any) => {
          let momentDate = moment(val);
          let valueToSet = "";
          if (momentDate.isValid()) {
            valueToSet = momentDate.toISOString();
          }

          control.setValue(valueToSet,
            {
              emitEvent: false,
              emitModelToViewChange: false
            });
        });
    }
  }

  private subscribeFormatNumberValue(control: FormControl, type: string) {
    control.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((val: any) => {
        let valueToSet: any = val;
        try {
          if (type == 'integer') {
            valueToSet = parseInt(val);
          }
          if (type == 'number' || type == 'duration') {
            valueToSet = parseFloat(val);
          }
        } catch (error) {
          valueToSet = null;
        }
        if (!Number.isFinite(valueToSet)) {
          valueToSet = val;
        }
        control.setValue(valueToSet,
          {
            emitEvent: false,
            emitModelToViewChange: false
          });
      });
  }

  private getValidators(item: any): ValidatorFn[] {
    const validators = [];

    if (item.required) {
      validators.push(Validators.required);
    }

    if (item.pattern) {
      validators.push(Validators.pattern(item.pattern));
      return validators;
    }

    if (item.format === 'email') {
      validators.push(Validators.pattern(/^\w+@[a-zA-Z_]+?\.[a-zA-Z]{2,3}$/));
    }

    if (item.type === 'number') {
      validators.push(Validators.pattern(/^-?\d*(\.\d+)?$/));
    }

    if (item.format === 'duration') {
      validators.push(Validators.pattern(/^[0-9]+$/));
    }

    if (item.type === 'integer') {
      validators.push(Validators.pattern(/^-?\d*$/));
    }

    if (item.format === 'url') {
      validators.push(Validators.pattern(/^(http:\/\/www\.|https:\/\/www\.|http:\/\/|https:\/\/)?[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,5}(:[0-9]{1,5})?(\/.*)?$/));
    }

    return validators;
  }

  ngOnDestroy() {
    this.destroy$.next(true);
    this.destroy$.unsubscribe();
  }
}
