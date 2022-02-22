import { Component, Inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ImportType, Schema, SchemaHelper } from 'interfaces';
import { Observable, ReplaySubject } from 'rxjs';
import { SchemaService } from 'src/app/services/schema.service';
/**
 * Dialog allowing you to select a file and load schemes.
 */
@Component({
    selector: 'import-schema-dialog',
    templateUrl: './import-schema-dialog.component.html',
    styleUrls: ['./import-schema-dialog.component.css']
})
export class ImportSchemaDialog {
  importType?: ImportType;
  dataForm = this.fb.group({
    timestamp: ['', Validators.required]
  });
  loading: boolean = false;

  public isImportTypeSelected: boolean = false;

  constructor(
    public dialogRef: MatDialogRef<ImportSchemaDialog>,
    private fb: FormBuilder,
    private schemaService: SchemaService,
    @Inject(MAT_DIALOG_DATA) public data: any) {
  }

  setImportType(importType: ImportType) {
    this.importType = importType;
    this.isImportTypeSelected = true;
  }

  onNoClick(): void {
    this.dialogRef.close(null);
  }

  importFromMessage() {
    if (!this.dataForm.valid) {
      return;
    }

    this.loading = true;
    const messageId = this.dataForm.get('timestamp')?.value;

    this.schemaService.previewByMessage(messageId)
      .subscribe(result => {
        this.loading = false;
        this.dialogRef.close({
          type: 'message',
          data: messageId,
          schemes: result
        });
      }, error => {
        this.loading = false;
      });
  }

  importFromFile() {
    this.loading = true;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.zip';
    input.click();
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      const reader = new FileReader()
      reader.readAsArrayBuffer(file);
      reader.addEventListener('load', (e: any) => {
        const arrayBuffer = e.target.result;
        this.loading = true;
        this.schemaService.previewByFile(arrayBuffer).subscribe((result) => {
          this.loading = false;
          this.dialogRef.close({
            type: 'file',
            data: arrayBuffer,
            schemes: result
          });
        }, (e) => {
          this.loading = false;
        });
      });
    }
  }
}
