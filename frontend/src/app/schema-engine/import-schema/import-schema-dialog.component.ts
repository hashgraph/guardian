import { Component, Inject } from '@angular/core';
import { FormBuilder } from '@angular/forms';
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
    schemes: any[];
    valid: boolean = false;
    newSchemes!: any;
    importType?: ImportType;
    dataForm = this.fb.group({
      timestamp: ['']
    });
    callbackIpfsImport: any

    private _isimportTypeSelected$ = new ReplaySubject<boolean>(1);

    constructor(
        public dialogRef: MatDialogRef<ImportSchemaDialog>,
        private fb: FormBuilder,
        private schemaService: SchemaService,
        @Inject(MAT_DIALOG_DATA) public data: any
    ) {
        this.schemes = data.schemes || [];
        this._isimportTypeSelected$.next(false);
    }

    public get isImportTypeSelected$(): Observable<boolean> {
      return this._isimportTypeSelected$;
    }

    setImportType(importType: ImportType) {
      this.importType = importType;
      this._isimportTypeSelected$.next(true);
    }

    getDialogTitle() {
      switch (this.importType){
        case ImportType.FILE:
          return "Import Schemes";
        case ImportType.IPFS:
          return "Enter hedera message timestamp";
        default:
          return "";
      }
    }

    ngOnInit() {
        this.callbackIpfsImport = this.data.callbackIpfsImport;
        this.setImportType(ImportType.IPFS);
    }

    onNoClick(): void {
        this.dialogRef.close(null);
    }

    onTimestampSubmit() {
      if (!this.dataForm.valid)
      {
        return;
      }

      const topicId = this.dataForm.get('timestamp')?.value;

      this.schemaService.topicPreview(topicId)
        .subscribe(schema => {
            this.dialogRef.close(null);
            this.callbackIpfsImport(schema, topicId);
          });
    }

    onSubmit() {
        if (this.valid) {
            this.dialogRef.close({ schemes: this.newSchemes });
        }
    }

    async onFileInput(event: any) {
        const files = event?.target?.files as FileList;
        const fileToUpload = files?.item(0);

        this.valid = false;
        this.newSchemes = null;
        if (fileToUpload) {
            const content = await this.loadObject(fileToUpload);
            let schemes = null;
            try {
                schemes = this.parseFile(content)
            } catch (error) {
                schemes = null;
            }
            this.valid = !!(schemes && schemes.length);
            this.newSchemes = schemes;
        }
    }

    async loadObject(file: File): Promise<string> {
        const transaction = new Promise<string>(async (resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event: any) => {
                const configFile = event.target.result;
                resolve(configFile);
            }
            reader.onerror = (error) => {
                reject(error);
            }
            reader.readAsText(file);
        });
        return transaction;
    }

    parseFile(content: string) {
        try {
            let schemes = JSON.parse(content);
            if (typeof schemes == 'string') {
                schemes = JSON.parse(schemes);
            }
            if (Array.isArray(schemes)) {
                return this.validationSchema(schemes);
            } else {
                return this.validationSchema([schemes]);
            }
        } catch (error) {
            return null;
        }
    }

    validationSchema(schemes: any[]) {
        for (let i = 0; i < schemes.length; i++) {
            const schema = schemes[i];
            if (!SchemaHelper.validate(schema)) {
                return null;
            }
        }
        return schemes;
    }

    getTitle(schema:any) {
        return schema.document;
    }
}
