import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Schema } from 'interfaces';

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

    constructor(
        public dialogRef: MatDialogRef<ImportSchemaDialog>,
        @Inject(MAT_DIALOG_DATA) public data: any
    ) {
        this.schemes = data.schemes || [];
    }

    ngOnInit() {

    }

    onNoClick(): void {
        this.dialogRef.close(null);
    }

    onSubmit() {
        if(this.valid ) {
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
            if (!Schema.validate(schema)) {
                return null;
            }
        }
        return schemes;
    }

    getTitle(schema:any) {
        return schema.document;
    }
}