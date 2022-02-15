import { NgxMatDateAdapter, NGX_MAT_DATE_FORMATS } from '@angular-material-components/datetime-picker';
import { NgxMatMomentAdapter } from '@angular-material-components/moment-adapter';
import { ChangeDetectionStrategy, Component, Input, OnInit } from '@angular/core';
import { Schema, SchemaField } from 'interfaces';
import { DATETIME_FORMATS } from '../schema-form/schema-form.component';

/**
 * Form view by schema
 */
@Component({
  selector: 'app-schema-form-view',
  templateUrl: './schema-form-view.component.html',
  styleUrls: ['./schema-form-view.component.css'],
  providers: [
    { provide: NgxMatDateAdapter, useClass: NgxMatMomentAdapter },
    { provide: NGX_MAT_DATE_FORMATS, useValue: DATETIME_FORMATS }
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SchemaFormViewComponent implements OnInit {
  @Input('private-fields') hide!: { [x: string]: boolean };
  @Input('schema') schema!: Schema;
  @Input('fields') schemaFields!: SchemaField[];
  @Input('delimiter-hide') delimiterHide: boolean = false;
  @Input('values') values: any;

  fields: any[] | undefined = [];

  constructor() { }


  ngOnInit(): void {
  }

  ngOnChanges() {
    this.hide = this.hide || {};
    if (this.schemaFields) {
      this.update(this.schemaFields);
      return;
    } else if (this.schema) {
      this.update(this.schema.fields);
      return;
    }
    this.update();
  }

  update(schemaFields?: SchemaField[]) {
    if (!schemaFields) {
      return;
    }

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
        type: field.type,
        format: field.format,
        pattern: field.pattern
      }
      if (!field.isArray && !field.isRef) {
        let value = "";

        if (this.values) {
          value = this.values[item.name];
        }

        item.value = value;
      }
      if (!field.isArray && field.isRef) {
        item.fields = field.fields;
      }

      if (field.isArray && !field.isRef) {
        let value = [];

        if (this.values && this.values[item.name]) {
          value = this.values[item.name];
        }

        item.list = value;
      }
      
      if (field.isArray && field.isRef) {
        item.fields = field.fields;
        let value = [];

        if (this.values && this.values[item.name]) {
          value = this.values[item.name];
        }

        item.list = value;
      }
      fields.push(item);
    }
    this.fields = fields;
  }

  getCID(link: string): string {
    let matches = link.match(/Qm[1-9A-HJ-NP-Za-km-z]{44,}|b[A-Za-z2-7]{58,}|B[A-Z2-7]{58,}|z[1-9A-HJ-NP-Za-km-z]{48,}|F[0-9A-F]{50,}/);
    return matches
      ? matches[0]
      : "";
  }
}
