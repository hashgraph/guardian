import { Component } from '@angular/core';
import { UntypedFormControl, UntypedFormGroup, Validators } from '@angular/forms';
import { DialogService, DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { ToolsService } from 'src/app/services/tools.service';
import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { SearchToolDialog } from '../search-tool-dialog/search-tool-dialog.component';
/**
 * Dialog for export/import policy.
 */
@Component({
    selector: 'preview-policy-dialog',
    templateUrl: './preview-policy-dialog.component.html',
    styleUrls: ['./preview-policy-dialog.component.scss'],
})
export class PreviewPolicyDialog {
    public loading = true;
    public policy!: any;
    public schemas!: string;
    public tokens!: string;
    public tools!: string;
    public toolConfigs!: { name: string, messageId: string }[];
    public policyGroups!: string;
    public newVersions: any[] = [];
    public versionOfTopicId: any;
    public policies!: any[];
    public similar!: any[];
    public module!: any;
    public tool!: any;
    public xlsx!: any;
    public errors!: any;
    public toolForm!: UntypedFormGroup;
    public isFile?: boolean;
    public mode: string = 'new';
    public originalTracking: boolean = false;
    public formulas!: string;
    public title!: string;
    public validTool: {
        [messageId: string]: '' | 'load' | 'valid' | 'invalid'
    } = {};
    public validTools: boolean = true;
    public importRecords: boolean = false;
    public canImportRecords: boolean = false;
    private _destroy$ = new Subject<void>();
    private _destroyMap: any = {};
    private _map = new Map<string, boolean>();

    public get inValid(): boolean {
        if (!(this.policy || this.module || this.tool || this.xlsx)) {
            return true;
        }
        if (!this.toolForm.valid) {
            return true;
        }
        if (!this.validTools) {
            return true;
        }
        if (this.mode === 'version') {
            if (!this.versionOfTopicId) {
                return true;
            }
        }
        return false;
    }

    constructor(
        public ref: DynamicDialogRef,
        private toolsService: ToolsService,
        private dialogService: DialogService,
        public config: DynamicDialogConfig
    ) {
        this.validTool = {};
        this.validTools = true;
        this.toolForm = new UntypedFormGroup({});
        this.title = this.config.data.title || 'Preview'
        if (this.config.data.policy) {
            const importFile = this.config.data.policy;

            this.newVersions = importFile.newVersions || [];
            this.policy = importFile.policy;

            this.policyGroups = '';
            if (this.policy.policyRoles) {
                this.policyGroups += this.policy.policyRoles.join(', ');
            }

            const schemas = importFile.schemas || [];
            const tokens = importFile.tokens || [];

            this.schemas = schemas
                .map((s: any) => {
                    if (s.version) {
                        return `${s.name} (${s.version})`;
                    }
                    return s.name;
                })
                .join(', ');
            this.tokens = tokens.map((s: any) => s.tokenName).join(', ');

            const formulas = importFile.formulas || [];
            this.formulas = formulas.map((s: any) => s.name).join(', ');

            const similar = importFile.similar || [];
            this.similar = similar
                .map((s: any) => {
                    if (s.version) {
                        return `${s.name} (${s.version})`;
                    }
                    return s.name;
                })
                .join(', ');

            this.toolConfigs = importFile.tools || [];
            this.canImportRecords = !!importFile.withRecords;
            for (const toolConfigs of this.toolConfigs) {
                this.toolForm.addControl(
                    toolConfigs.messageId,
                    new UntypedFormControl(toolConfigs.messageId, [
                        Validators.required,
                        Validators.pattern(/^[0-9]{10}\.[0-9]{9}$/),
                    ])
                );
                this.validTool[toolConfigs.messageId] = 'load';
                this.checkTool(toolConfigs.messageId, toolConfigs.messageId);
            }
        }

        if (this.config.data.module) {
            this.module = this.config.data.module.module;
        }

        if (this.config.data.tool) {
            this.tool = this.config.data.tool?.tool;
            this.isFile = this.config.data.isFile;
            this.toolConfigs = this.config.data.tool.tools || [];
            if (this.isFile) {
                for (const toolConfigs of this.toolConfigs) {
                    this.toolForm.addControl(
                        toolConfigs.messageId,
                        new UntypedFormControl(toolConfigs.messageId, [
                            Validators.required,
                            Validators.pattern(/^[0-9]{10}\.[0-9]{9}$/),
                        ])
                    );
                    this.validTool[toolConfigs.messageId] = 'load';
                    this.checkTool(toolConfigs.messageId, toolConfigs.messageId);
                }
            }
            this.tools = this.toolConfigs.map((tool) => tool.name).join(', ');
        }

        if (this.config.data.xlsx) {
            this.xlsx = this.config.data.xlsx;
            const schemas = this.xlsx.schemas || [];
            this.schemas = schemas
                .map((s: any) => {
                    if (s.version) {
                        return `${s.name} (${s.version})`;
                    }
                    return s.name;
                })
                .join(', ');

            const tools = this.xlsx.tools || [];
            this.tools = tools
                .map((s: any) => {
                    return s.name;
                })
                .join(', ');

            tools
            this.errors = this.xlsx.errors || [];
            for (const error of this.errors) {
                if (error.cell) {
                    error.__path = `Cell: ${error.cell}`;
                } else if (error.row) {
                    error.__path = `Row: ${error.row}`;
                } else if (error.col) {
                    error.__path = `Col: ${error.col}`;
                }
            }
        }

        this.policies = this.config.data.policies || [];
    }

    public onFilters(messageId: string, $event: any) {
        const value = $event.target.value;
        this.checkTool(messageId, value);
    }

    private checkTool(messageId: string, value: string) {
        if (typeof value !== 'string' || !(/^[0-9]{10}\.[0-9]{9}$/.test(value))) {
            this.validTool[messageId] = 'invalid';
            return;
        }
        this.validTool[messageId] = 'load';
        this.updateToolStatus();
        if (this._destroyMap[messageId]) {
            this._destroyMap[messageId].unsubscribe();
            this._destroyMap[messageId] = null;
        }
        this._destroyMap[messageId] = this.toolsService
            .checkMessage(value)
            .pipe(takeUntil(this._destroy$))
            .subscribe((valid) => {
                this.validTool[messageId] = valid ? 'valid' : 'invalid';
                this._map.set(value, !!valid);
                this.updateToolStatus();
            }, () => {
                this.validTool[messageId] = 'invalid';
                this._map.set(value, false);
                this.updateToolStatus();
            });
    }

    private updateToolStatus() {
        const messageIds = Object.keys(this.validTool);
        this.validTools = true;
        for (const messageId of messageIds) {
            this.validTools = this.validTools && this.validTool[messageId] === 'valid';
        }
    }

    ngOnInit() {
        this.loading = false;
    }

    ngOnDestroy(): void {
        this._destroy$.next();
        this._destroy$.complete();
    }

    setData(data: any) {
    }

    onClose(): void {
        this.ref.close(false);
    }

    onImport() {
        this.ref.close({
            versionOfTopicId: this.versionOfTopicId,
            tools: this.toolForm?.value,
            demo: this.mode === 'demo',
            importRecords: this.canImportRecords ? this.importRecords : false,
            originalTracking: this.originalTracking
        });
    }

    onNewVersionClick(messageId: string) {
        this.ref.close({
            messageId,
            tools: this.toolForm?.value,
        });
    }

    onChangeType() {

    }

    onSelectMode(mode: string) {
        this.mode = mode;
    }

    public onToolSearch(toolConfig: any) {
        const dialogRef = this.dialogService.open(SearchToolDialog, {
            showHeader: false,
            width: '900px',
            styleClass: 'guardian-dialog',
            data: {
                name: toolConfig.name
            },
        });
        dialogRef.onClose.subscribe((result: string) => {
            if (result) {
                this.toolForm.controls[toolConfig.messageId]?.setValue(result);
                this.checkTool(toolConfig.messageId, result);
            }
        });
    }

    public enforceMask(messageId: string, event: any): void {
        const input = event.target as HTMLInputElement;
        let value = input.value;

        value = value.replace(/[^0-9.]/g, '');

        if (value.length > 10 && !value.includes('.')) {
            value = `${value.substring(0, 10)}.${value.substring(10)}`;
        }

        const parts = value.split('.');

        if (parts[0].length > 10) {
            parts[0] = parts[0].substring(0, 10);
        }
        if (parts[1] && parts[1].length > 9) {
            parts[1] = parts[1].substring(0, 9);
        }

        input.value = parts.join('.');

        if (this._map.has(input.value)) {
            this.validTool[messageId] = this._map.get(input.value) ? 'valid' : 'invalid';
            this.updateToolStatus();
        } else {
            this.validTool[messageId] = '';
            this.updateToolStatus();
        }

    }
}
