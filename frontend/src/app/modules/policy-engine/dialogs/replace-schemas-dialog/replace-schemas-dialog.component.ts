import { Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { FormArray, FormControl } from '@angular/forms';
import { Subscription } from 'rxjs';
import { DialogService } from 'primeng/dynamicdialog';
import {
    Schema,
    SchemaCategory,
} from '@guardian/interfaces';
import { VCViewerDialog } from '../../../schema-engine/vc-dialog/vc-dialog.component';
export interface SchemaOption {
  id: string;
  name: string;
}

@Component({
  selector: 'replace-schemas-dialog',
  templateUrl: './replace-schemas-dialog.component.html',
  styleUrls: ['./replace-schemas-dialog.component.scss'],
  providers: [DialogService],
})
export class ReplaceSchemasDialogComponent implements OnDestroy {
  title = 'Select Schemas';
  schemas: Schema[] = [];
  checks = new FormArray<FormControl<boolean>>([]);
  master = new FormControl<boolean>(false, { nonNullable: true });
  public isLargeSize: boolean = true;
  @ViewChild('dialogHeader', { static: false }) dialogHeader!: ElementRef<HTMLDivElement>;
  private subs = new Subscription();


  constructor(
    public ref: DynamicDialogRef,
    public config: DynamicDialogConfig,
    private dialogService: DialogService
  ) {
    this.title = this.config.data?.title || this.title;
    this.schemas = Array.isArray(this.config.data?.schemasCanBeReplaced) ? this.config.data.schemasCanBeReplaced : [];
    this.buildChecks();
    this.wireUpMasterSync();
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }

  private buildChecks() {
    this.checks.clear();
    this.schemas.forEach(() =>
      this.checks.push(new FormControl<boolean>(false, { nonNullable: true }))
    );
    this.master.setValue(false, { emitEvent: false });
  }

  private wireUpMasterSync() {
    this.subs.add(
      this.master.valueChanges.subscribe(checked => {
        this.checks.controls.forEach(c => c.setValue(!!checked, { emitEvent: false }));
        this.checks.updateValueAndValidity({ emitEvent: true });
      })
    );

    this.subs.add(
      this.checks.valueChanges.subscribe(values => {
        const allSelected = values.length > 0 && values.every(v => !!v);
        if (this.master.value !== allSelected) {
          this.master.setValue(allSelected, { emitEvent: false });
        }
      })
    );
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

  public onOpenDocument(schema: Schema): void {
        this.dialogService.open(VCViewerDialog, {
            showHeader: false,
            width: '90%',
            styleClass: 'guardian-dialog',
            data: {
                row: schema,
                document: schema?.document,
                title: 'Schema',
                type: 'JSON',
                topicId: schema.topicId,
                schemaId: schema.id,
                category: SchemaCategory.POLICY
            }
        });
    }

    public toggleSize(): void {
        this.isLargeSize = !this.isLargeSize;
        setTimeout(() => {
            if (this.dialogHeader) {
                const dialogEl = this.dialogHeader.nativeElement.closest('.p-dynamic-dialog, .guardian-dialog') as HTMLElement;
                if (dialogEl) {
                    if (this.isLargeSize) {
                        dialogEl.style.width = '90vw';
                        dialogEl.style.maxWidth = '90vw';
                    } else {
                        dialogEl.style.width = '50vw';
                        dialogEl.style.maxWidth = '50vw';
                    }
                    dialogEl.style.maxHeight = '90vh'
                    dialogEl.style.margin = 'auto';
                    dialogEl.style.transition = 'all 0.3s ease';
                }
            }
        }, 100);
    }
}
