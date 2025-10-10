import { Component } from '@angular/core';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { FormArray, FormControl } from '@angular/forms';

export interface SchemaOption {
  id: string;
  name: string;
}

@Component({
  selector: 'replace-schemas-dialog',
  templateUrl: './replace-schemas-dialog.component.html',
  styleUrls: ['./replace-schemas-dialog.component.scss'],
})
export class ReplaceSchemasDialogComponent {
  title = 'Select Schemas';
  schemas: SchemaOption[] = [];
  checks = new FormArray<FormControl<boolean>>([]);

  constructor(
    public ref: DynamicDialogRef,
    public config: DynamicDialogConfig
  ) {
    console.log(this.config, 'config');
    this.title = this.config.data?.title || this.title;
    this.schemas = Array.isArray(this.config.data?.shemas) ? this.config.data.shemas : [];
    console.log(this.schemas, 'schemas');
    this.buildChecks();
  }

  private buildChecks() {
    this.checks.clear();
    this.schemas.forEach(() => this.checks.push(new FormControl<boolean>(false, { nonNullable: true })));
  }

  get selectedIds(): string[] {
    return this.checks.controls
      .map((ctrl, i) => (ctrl.value ? this.schemas[i].id : null))
      .filter((v): v is string => !!v);
  }

  onClose() {
    this.ref.close(null);
  }

  onSubmit() {
    this.ref.close({ selectedSchemaIds: this.selectedIds });
  }
}
