import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormBuilder } from '@angular/forms';
import { Observable, ReplaySubject } from 'rxjs';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { ImportType } from 'interfaces';

/**
 * Dialog for creating policy.
 */
@Component({
  selector: 'import-policy-dialog',
  templateUrl: './import-policy-dialog.component.html',
  styleUrls: ['./import-policy-dialog.component.css']
})
export class ImportPolicyDialog {
  importType?: ImportType;
  dataForm = this.fb.group({
    timestamp: ['']
  });
  loading: boolean = false;

  private _isimportTypeSelected$ = new ReplaySubject<boolean>(1);

  constructor(
    public dialogRef: MatDialogRef<ImportPolicyDialog>,
    private fb: FormBuilder,
    private policyEngineService: PolicyEngineService,
    @Inject(MAT_DIALOG_DATA) public data: any) {
    this._isimportTypeSelected$.next(false);
  }

  public get isImportTypeSelected$(): Observable<boolean> {
    return this._isimportTypeSelected$;
  }

  ngOnInit() {
    // this.setImportType(ImportType.IPFS);
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

    this.policyEngineService.previewByMessage(messageId)
      .subscribe(result => {
        this.loading = false;
        this.dialogRef.close({
          type: 'message',
          data: messageId,
          policy: result
        });
      }, error => {
        this.loading = false;
      });
  }

  setImportType(importType: ImportType) {
    this.importType = importType;
    this._isimportTypeSelected$.next(true);
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
        this.policyEngineService.previewByFile(arrayBuffer).subscribe((result) => {
          this.loading = false;
          this.dialogRef.close({
            type: 'file',
            data: arrayBuffer,
            policy: result
          });
        }, (e) => {
          this.loading = false;
        });
      });
    }
  }
}
