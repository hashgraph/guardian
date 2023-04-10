import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormBuilder, Validators } from '@angular/forms';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { ImportType } from '@guardian/interfaces';
import { InformService } from 'src/app/services/inform.service';
import { TasksService } from 'src/app/services/tasks.service';
import { ModulesService } from 'src/app/services/modules.service';

/**
 * Dialog for creating policy.
 */
@Component({
    selector: 'import-policy-dialog',
    templateUrl: './import-policy-dialog.component.html',
    styleUrls: ['./import-policy-dialog.component.css']
})
export class ImportPolicyDialog {
    type?: string;
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
        public dialogRef: MatDialogRef<ImportPolicyDialog>,
        private fb: FormBuilder,
        private policyEngineService: PolicyEngineService,
        private modulesService: ModulesService,
        private informService: InformService,
        private taskService: TasksService,
        @Inject(MAT_DIALOG_DATA) public data: any
    ) {
        this.type = data.type === 'module' ? 'module' : 'policy';
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
                    policy: result
                });
            }, (e) => {
                this.loading = false;
            });
        }
    }

    importFromMessage() {
        if(this.type === 'module') {
            this.moduleFromMessage();
        } else {
            this.policyFromMessage();
        }
    }

    importFromFile(file: any) {
        if(this.type === 'module') {
            this.moduleFromFile(file);
        } else {
            this.policyFromFile(file);
        }
    }

    moduleFromMessage() {
        if (!this.dataForm.valid) {
            return;
        }
        this.loading = true;
        const messageId = this.dataForm.get('timestamp')?.value;
        this.modulesService.previewByMessage(messageId).subscribe((result) => {
            this.loading = false;
            this.dialogRef.close({
                type: 'message',
                data: this.dataForm.get('timestamp')?.value,
                module: result
            });
        }, (error) => {
            this.loading = false;
        });
    }

    moduleFromFile(file: any) {
        const reader = new FileReader()
        reader.readAsArrayBuffer(file);
        reader.addEventListener('load', (e: any) => {
            const arrayBuffer = e.target.result;
            this.loading = true;
            this.modulesService.previewByFile(arrayBuffer).subscribe((result) => {
                this.loading = false;
                this.dialogRef.close({
                    type: 'file',
                    data: arrayBuffer,
                    module: result
                });
            }, (e) => {
                this.loading = false;
            });
        });
    }

    policyFromMessage() {
        if (!this.dataForm.valid) {
            return;
        }
        this.loading = true;
        const messageId = this.dataForm.get('timestamp')?.value;
        this.policyEngineService.pushPreviewByMessage(messageId).subscribe((result) => {
            const { taskId, expectation } = result;
            this.taskId = taskId;
            this.expectedTaskMessages = expectation;
        }, (error) => {
            this.loading = false;
            this.taskId = undefined;
        });
    }

    policyFromFile(file: any) {
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
