import { Component, Inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ImportType, Schema, SchemaHelper } from '@guardian/interfaces';
import { Observable, ReplaySubject } from 'rxjs';
import { InformService } from 'src/app/services/inform.service';
import { SchemaService } from 'src/app/services/schema.service';
import { TasksService } from 'src/app/services/tasks.service';
/**
 * Dialog allowing you to select a file and load schemas.
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

    taskId: string | undefined = undefined;
    expectedTaskMessages: number = 0;

    public isImportTypeSelected: boolean = false;

    public innerWidth: any;
    public innerHeight: any;

    constructor(
        public dialogRef: MatDialogRef<ImportSchemaDialog>,
        private fb: FormBuilder,
        private schemaService: SchemaService,
        private informService: InformService,
        private taskService: TasksService,
        @Inject(MAT_DIALOG_DATA) public data: any) {
        if (data.timeStamp) {
            this.importType = ImportType.IPFS;
            this.isImportTypeSelected = true;
            this.dataForm.patchValue({
                timestamp: data.timeStamp
            });
            this.importFromMessage();
        }
    }

    ngOnInit() {
      this.innerWidth = window.innerWidth;
      this.innerHeight = window.innerHeight;
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

        this.schemaService.pushPreviewByMessage(messageId).subscribe((result) => {
            const { taskId, expectation } = result;
            this.taskId = taskId;
            this.expectedTaskMessages = expectation;
        }, (e) => {
            this.loading = false;
            this.taskId = undefined;
        });
    }

    onAsyncError(error: any) {
        this.informService.processAsyncError(error);
        this.loading = false;
        this.taskId = undefined;
    }

    onAsyncCompleted() {
        if (this.taskId) {
            const taskId: string = this.taskId;
            this.taskId = undefined;
            this.taskService.get(taskId).subscribe((task) => {
                this.loading = false;
                const { result } = task;
                this.dialogRef.close({
                    type: 'message',
                    data: this.dataForm.get('timestamp')?.value,
                    schemas: result
                });
            }, (e) => {
                this.loading = false;
            });
        }
    }

    importFromFile(file: any) {
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
                    schemas: result
                });
            }, (e) => {
                this.loading = false;
            });
        });
    }
}
