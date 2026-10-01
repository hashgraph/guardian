import { ChangeDetectorRef, Component, ElementRef, ViewChild } from '@angular/core';
import { UntypedFormControl, UntypedFormGroup, Validators } from '@angular/forms';
import { DialogService, DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { ToolsService } from 'src/app/services/tools.service';
import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { SearchToolDialog } from '../search-tool-dialog/search-tool-dialog.component';
import { SchemaTemplatesService } from 'src/app/services/schema-templates.service';
import { SearchSchemaTemplateDialog } from '../search-schema-template-dialog/search-schema-template-dialog.component';
import { ModuleStatus } from '@guardian/interfaces';

/** One row per binding on the imported policy - a policy can carry several templates. */
interface SchemaTemplateRow {
    binding: any;
    templateId: string;
    templateName: string;
    templateVersion?: string;
    templateStatus?: string;
    messageId: string;
    status: '' | 'load' | 'local' | 'network' | 'invalid';
    selectedOverride: any;
    detach: boolean;
    valid: boolean;
}

/** A named entry rendered as a chip in the preview lists. */
interface PreviewItem {
    name: string;
    version?: string;
}

type PreviewSection = 'schemas' | 'tools' | 'templates' | 'tokens' | 'formulas' | 'similar' | 'errors';

/** Two rows of chips; the schema list is clamped to this height until expanded. */
const CHIP_LIST_CLAMP_HEIGHT = 60;

/**
 * Dialog for export/import policy.
 */
@Component({
    selector: 'preview-policy-dialog',
    templateUrl: './preview-policy-dialog.component.html',
    styleUrls: ['./preview-policy-dialog.component.scss'],
    standalone: false
})
export class PreviewPolicyDialog {
    public loading = true;
    public policy!: any;
    public schemas: PreviewItem[] = [];
    public tokens: PreviewItem[] = [];
    public tools: PreviewItem[] = [];
    public toolConfigs: { name: string, messageId: string }[] = [];
    public roles: string[] = [];
    public newVersions: any[] = [];
    public versionOfTopicId: any;
    public policies!: any[];
    public similar: PreviewItem[] = [];
    public module!: any;
    public tool!: any;
    public xlsx!: any;
    public errors!: any;
    public toolForm!: UntypedFormGroup;
    public isFile?: boolean;
    public mode: string = 'new';
    public originalTracking: boolean = false;
    public formulas: PreviewItem[] = [];
    public title!: string;
    public validTool: {
        [messageId: string]: '' | 'load' | 'valid' | 'invalid'
    } = {};
    public validTools: boolean = true;
    public schemaTemplateRows: SchemaTemplateRow[] = [];
    public schemaTemplateSnapshots: any[] = [];
    public validSchemaTemplate: boolean = true;
    public importRecords: boolean = false;
    public canImportRecords: boolean = false;
    private _destroy$ = new Subject<void>();
    private _destroyMap: any = {};
    private _schemaTemplateDestroyMap: any = {};
    private _map = new Map<string, boolean>();

    public sections: Record<PreviewSection, boolean> = {
        schemas: true,
        tools: true,
        templates: true,
        tokens: false,
        formulas: false,
        similar: false,
        errors: true,
    };
    public showAllSchemas: boolean = false;
    public schemasOverflow: boolean = false;
    public descriptionExpanded: boolean = false;
    public searchActive: boolean = false;
    public creatorCopied: boolean = false;
    private _schemaListObserver?: ResizeObserver;

    public isLargeSize: boolean = true;
    @ViewChild('dialogHeader', { static: false }) dialogHeader!: ElementRef<HTMLDivElement>;

    @ViewChild('schemaList', { static: false })
    set schemaList(el: ElementRef<HTMLDivElement> | undefined) {
        this._schemaListObserver?.disconnect();
        this._schemaListObserver = undefined;
        if (!el || typeof ResizeObserver === 'undefined') {
            return;
        }
        const element = el.nativeElement;
        this._schemaListObserver = new ResizeObserver(() => {
            const overflow = element.scrollHeight > CHIP_LIST_CLAMP_HEIGHT;
            if (overflow !== this.schemasOverflow) {
                this.schemasOverflow = overflow;
                this.cdr.detectChanges();
            }
        });
        this._schemaListObserver.observe(element);
    }

    public get invalidToolsCount(): number {
        return this.toolConfigs.filter((t) => this.validTool[t.messageId] === 'invalid').length;
    }

    public get templatesAttentionCount(): number {
        return this.schemaTemplateRows.filter((row) => row.status === 'invalid' && !row.detach).length;
    }

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
        if (!this.validSchemaTemplate) {
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
        private schemaTemplatesService: SchemaTemplatesService,
        private dialogService: DialogService,
        private cdr: ChangeDetectorRef,
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

            this.roles = ['Standard Registry', ...(this.policy.policyRoles || [])];
            this.schemas = this.toItems(importFile.schemas);
            this.tokens = (importFile.tokens || []).map((t: any) => ({ name: t.tokenName }));
            this.formulas = this.toItems(importFile.formulas);
            this.similar = this.toItems(importFile.similar);

            this.toolConfigs = importFile.tools || [];
            this.schemaTemplateSnapshots = importFile.schemaTemplateSnapshots || [];
            const schemaTemplateBindings = this.policy.schemaTemplates || [];
            this.schemaTemplateRows = schemaTemplateBindings
                .filter((binding: any) => !!binding?.templateId)
                .map((binding: any) => this.buildSchemaTemplateRow(binding));
            this.updateSchemaTemplateStatus();
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
            this.tools = this.toItems(this.toolConfigs);
        }

        if (this.config.data.xlsx) {
            this.xlsx = this.config.data.xlsx;
            this.schemas = this.toItems(this.xlsx.schemas);
            this.tools = this.toItems(this.xlsx.tools);
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

    private toItems(list: any[] | undefined): PreviewItem[] {
        return (list || []).map((item: any) => ({ name: item.name, version: item.version }));
    }

    public isSectionOpen(section: PreviewSection): boolean {
        return this.searchActive || this.isSectionForced(section) || this.sections[section];
    }

    /** Sections with something to fix stay open so the problem is never hidden. */
    public isSectionForced(section: PreviewSection): boolean {
        if (section === 'tools') {
            return this.invalidToolsCount > 0;
        }
        if (section === 'templates') {
            return this.templatesAttentionCount > 0;
        }
        return false;
    }

    public toggleSection(section: PreviewSection): void {
        if (this.searchActive || this.isSectionForced(section)) {
            return;
        }
        this.sections[section] = !this.sections[section];
    }

    public onSearchQueryChange(query: string): void {
        this.searchActive = !!query;
    }

    public shortenId(value: string): string {
        if (!value || value.length <= 44) {
            return value;
        }
        return `${value.substring(0, 26)}…${value.substring(value.length - 16)}`;
    }

    public copyCreator(value: string, event?: Event): void {
        event?.stopPropagation();
        if (!value) {
            return;
        }
        navigator.clipboard.writeText(value).then(() => {
            this.creatorCopied = true;
            setTimeout(() => {
                this.creatorCopied = false;
            }, 1500);
        }).catch(() => {
            this.creatorCopied = false;
        });
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

    private buildSchemaTemplateRow(binding: any): SchemaTemplateRow {
        const row: SchemaTemplateRow = {
            binding,
            templateId: binding.templateId,
            templateName: binding.templateName || 'Schema Template',
            templateVersion: binding.templateVersion,
            templateStatus: binding.templateStatus,
            messageId: binding.templateMessageId || '',
            status: '',
            selectedOverride: null,
            detach: false,
            valid: false,
        };
        // Check even with an empty messageId, or a draft-applied template leaves the row
        // blocking import with status '' and no visible error.
        this.checkSchemaTemplateRow(row, row.messageId);
        return row;
    }

    public onSchemaTemplateMessageChange(row: SchemaTemplateRow, event: any): void {
        const value = event.target.value;
        row.messageId = value;
        row.selectedOverride = null;
        this.checkSchemaTemplateRow(row, value);
    }

    private checkSchemaTemplateRow(row: SchemaTemplateRow, messageId: string): void {
        if (row.detach) {
            row.valid = true;
            this.updateSchemaTemplateStatus();
            return;
        }
        if (typeof messageId !== 'string' || !(/^[0-9]{10}\.[0-9]{9}$/.test(messageId))) {
            row.status = 'invalid';
            row.valid = false;
            this.updateSchemaTemplateStatus();
            return;
        }
        row.status = 'load';
        row.valid = false;
        this.updateSchemaTemplateStatus();
        if (this._schemaTemplateDestroyMap[row.templateId]) {
            this._schemaTemplateDestroyMap[row.templateId].unsubscribe();
            this._schemaTemplateDestroyMap[row.templateId] = null;
        }
        this._schemaTemplateDestroyMap[row.templateId] = this.schemaTemplatesService
            .checkMessage(messageId)
            .pipe(takeUntil(this._destroy$))
            .subscribe((result) => {
                row.status = result?.status === 'local'
                    ? 'local'
                    : result?.status === 'network'
                        ? 'network'
                        : 'invalid';
                row.valid = row.status === 'local' || row.status === 'network';
                this.updateSchemaTemplateStatus();
            }, () => {
                row.status = 'invalid';
                row.valid = false;
                this.updateSchemaTemplateStatus();
            });
    }

    public onDetachSchemaTemplateChange(row: SchemaTemplateRow): void {
        if (row.detach) {
            row.valid = true;
            this.updateSchemaTemplateStatus();
            return;
        }
        if (row.selectedOverride) {
            row.valid = true;
            this.updateSchemaTemplateStatus();
            return;
        }
        this.checkSchemaTemplateRow(row, row.messageId);
    }

    private updateSchemaTemplateStatus(): void {
        this.validSchemaTemplate = this.schemaTemplateRows.every((row) => row.valid);
    }

    ngOnInit() {
        this.loading = false;
    }

    ngOnDestroy(): void {
        this._schemaListObserver?.disconnect();
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
            schemaTemplates: this.getSchemaTemplateMetadataMap(),
            demo: this.mode === 'demo',
            importRecords: this.canImportRecords ? this.importRecords : false,
            originalTracking: this.originalTracking
        });
    }

    onNewVersionClick(messageId: string) {
        this.ref.close({
            messageId,
            tools: this.toolForm?.value,
            schemaTemplates: this.getSchemaTemplateMetadataMap(),
        });
    }

    onSelectMode(mode: string) {
        this.mode = mode;
    }

    public onToolSearch(toolConfig: any) {
        const dialogRef = this.dialogService.open(SearchToolDialog, {
            showHeader: false,
            width: '90%',
            styleClass: 'guardian-dialog',
            data: {
                name: toolConfig.name
            },
        })!;
        dialogRef.onClose.subscribe((result: string) => {
            if (result) {
                this.toolForm.controls[toolConfig.messageId]?.setValue(result);
                this.checkTool(toolConfig.messageId, result);
            }
        });
    }

    /**
     * The binding carries the status as it was on the source instance, so an
     * unrecognised value is echoed back rather than collapsed into 'Draft'.
     */
    public getTemplateStatusLabel(status?: string): string {
        switch (status) {
            case ModuleStatus.PUBLISHED:
                return 'Published';
            case ModuleStatus.PUBLISH_ERROR:
                return 'Publish Error';
            case ModuleStatus.DRY_RUN:
                return 'Dry Run';
            case ModuleStatus.DRAFT:
                return 'Draft';
            default:
                return status || '';
        }
    }

    public onSchemaTemplateSearch(row: SchemaTemplateRow): void {
        const dialogRef = this.dialogService.open(SearchSchemaTemplateDialog, {
            showHeader: false,
            width: '90%',
            styleClass: 'guardian-dialog',
            data: {
                name: row.templateName || ''
            },
        })!;
        dialogRef.onClose.subscribe((result: any) => {
            if (result) {
                row.selectedOverride = result;
                row.messageId = result.messageId || '';
                row.status = 'local';
                row.valid = true;
                this.updateSchemaTemplateStatus();
            }
        });
    }

    private getSchemaTemplateRowMetadata(row: SchemaTemplateRow): any {
        if (row.detach) {
            return { detach: true };
        }
        if (row.selectedOverride?.id) {
            return {
                templateId: row.selectedOverride.id
            };
        }
        return {
            templateMessageId: row.messageId
        };
    }

    private getSchemaTemplateMetadataMap(): { [templateId: string]: any } | undefined {
        if (!this.schemaTemplateRows.length) {
            return undefined;
        }
        const map: { [templateId: string]: any } = {};
        for (const row of this.schemaTemplateRows) {
            map[row.templateId] = this.getSchemaTemplateRowMetadata(row);
        }
        return map;
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
