import { Component, Inject } from '@angular/core';
import { UntypedFormBuilder, Validators } from '@angular/forms';

import { Observable, ReplaySubject } from 'rxjs';
import { DynamicDialogRef, DynamicDialogConfig } from 'primeng/dynamicdialog';

export enum ToolSaveAction {
    CREATE_NEW_TOOL = 1,
    CREATE_NEW_VERSION = 2
}

/**
 * Dialog for creating tool.
 */
@Component({
    selector: 'save-tool-dialog',
    templateUrl: './save-tool-dialog.component.html',
    styleUrls: ['./save-tool-dialog.component.scss']
})
export class SaveToolDialog {
    action?: ToolSaveAction;
    dataForm = this.fb.group({});
    isNewVersionDisabled: boolean = false;
    data: any;

    private _isActionSelected$ = new ReplaySubject<boolean>(1);

    constructor(
        public dialogRef: DynamicDialogRef,
        public config: DynamicDialogConfig,
        private fb: UntypedFormBuilder,
    ) {
        this.data = config.data;

        if (this.data.action) {
            this.setAction(this.data.action);
        } else {
            this._isActionSelected$.next(false);
        }

        this.isNewVersionDisabled = this.data.tool.owner !== this.data.tool.creator;
    }

    public get isActionSelected$(): Observable<boolean> {
        return this._isActionSelected$;
    }

    ngOnInit() {}

    onNoClick(): void {
        this.dialogRef.close(null);
    }

    onSubmit() {
        if (this.dataForm.valid) {
            const data = this.dataForm.value;
            this.dialogRef.close({
                tool: data,
                action: this.action
            });
        }
    }

    setAction(action: ToolSaveAction) {
        this.action = action;
        const tag = `Tag_${Date.now()}`;
        if (this.action === ToolSaveAction.CREATE_NEW_TOOL) {
            this.dataForm = this.fb.group({
                name: ['', Validators.required],
                description: ['']
            });
        } else if (this.action === ToolSaveAction.CREATE_NEW_VERSION) {
            this.dataForm = this.fb.group({
                name: [{ value: this.data.tool.name, disabled: true }, Validators.required],
                description: [this.data.tool.description]
            });
        }
        this._isActionSelected$.next(true);
    }

    getTitle(): string {
        switch (this.action) {
            case ToolSaveAction.CREATE_NEW_TOOL:
                return 'New Tool';
            case ToolSaveAction.CREATE_NEW_VERSION:
                return 'New Version'
            default:
                return '';
        }
    }
}
