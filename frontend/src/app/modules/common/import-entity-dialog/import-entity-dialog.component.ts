import { ChangeDetectorRef, Component, Inject } from '@angular/core';
import { UntypedFormBuilder, Validators } from '@angular/forms';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { ImportType } from '@guardian/interfaces';
import { InformService } from 'src/app/services/inform.service';
import { TasksService } from 'src/app/services/tasks.service';
import { ModulesService } from 'src/app/services/modules.service';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { MenuItem } from 'primeng/api';
import { ToolsService } from 'src/app/services/tools.service';
import { SchemaRulesService } from 'src/app/services/schema-rules.service';
import { PolicyStatisticsService } from 'src/app/services/policy-statistics.service';
import { PolicyLabelsService } from 'src/app/services/policy-labels.service';
import { FormulasService } from 'src/app/services/formulas.service';

export enum ImportEntityType {
    Policy = 'policy',
    Module = 'module',
    Tool = 'tool',
    Xlsx = 'xlsx',
    Record = 'record',
    SchemaRule = 'schema-rule',
    Theme = 'theme',
    Statistic = 'statistic',
    PolicyLabel = 'policy-label',
    Formula = 'formula',
}

export interface IImportEntityArray {
    type: 'file',
    data: ArrayBuffer,
    policy?: any,
    tool?: any
    module?: any,
    xlsx?: any,
    rule?: any,
    statistic?: any,
    label?: any,
    formula?: any,
    schemasCanBeReplaced?: any,
}

export interface IImportEntityMessage {
    type: 'message',
    data: string,
    policy?: any,
    tool?: any
    module?: any,
    xlsx?: any,
    rule?: any,
    statistic?: any,
    label?: any,
    formula?: any,
    schemasCanBeReplaced?: any,
}

export type IImportEntityResult = IImportEntityArray | IImportEntityMessage;

/**
 * Dialog for creating entity.
 */
@Component({
    selector: 'import-entity-dialog',
    templateUrl: './import-entity-dialog.component.html',
    styleUrls: ['./import-entity-dialog.component.scss'],
})
export class ImportEntityDialog {
    public loading: boolean = false;
    public title: string = 'Import Entity';

    public taskId: string | undefined = undefined;
    public expectedTaskMessages: number = 0;

    public type: ImportEntityType = ImportEntityType.Policy;
    public importType: ImportType = ImportType.FILE;
    public recordSource: 'file' | 'imported' = 'file';
    public canUseImportedRecords = false;
    public recordSourceOptions = [
        { label: 'Import from file', value: 'file' },
        { label: 'Use records imported with this policy', value: 'imported' },
    ];
    public syncNewRecords: boolean = false;

    public dataForm = this.fb.group({
        timestamp: ['', Validators.required],
    });
    public items: MenuItem[] = [
        { label: 'Import from file' },
        { label: 'Import from IPFS' },
    ];

    public canImportFile: boolean = false;
    public canImportMessage: boolean = false;
    public fileExtension: string = 'policy';
    public placeholder: string = '';

    constructor(
        public ref: DynamicDialogRef,
        public config: DynamicDialogConfig<{
            type?: string,
            timeStamp?: string,
            withRecords?: boolean,
        }>,
        //Form
        private fb: UntypedFormBuilder,
        private changeDetectorRef: ChangeDetectorRef,
        //Services
        private policyEngineService: PolicyEngineService,
        private modulesService: ModulesService,
        private toolsService: ToolsService,
        private informService: InformService,
        private taskService: TasksService,
        private schemaRulesService: SchemaRulesService,
        private policyStatisticsService: PolicyStatisticsService,
        private policyLabelsService: PolicyLabelsService,
        private formulasService: FormulasService,
    ) {
        const _config = this.config.data || {};
        this.canUseImportedRecords = !!_config.withRecords;
        switch (_config.type) {
            case 'policy':
                this.type = ImportEntityType.Policy;
                this.canImportFile = true;
                this.canImportMessage = true;
                this.title = 'Import Policy';
                this.fileExtension = 'policy';
                this.placeholder = 'Import Policy .policy file';
                break;
            case 'module':
                this.type = ImportEntityType.Module;
                this.canImportFile = true;
                this.canImportMessage = true;
                this.title = 'Import Module';
                this.fileExtension = 'module';
                this.placeholder = 'Import Module .module file';
                break;
            case 'tool':
                this.type = ImportEntityType.Tool;
                this.canImportFile = true;
                this.canImportMessage = true;
                this.title = 'Import Tool';
                this.fileExtension = 'tool';
                this.placeholder = 'Import Tool .tool file';
                break;
            case 'xlsx':
                this.type = ImportEntityType.Xlsx;
                this.canImportFile = true;
                this.canImportMessage = false;
                this.title = 'Import Xlsx';
                this.fileExtension = 'xlsx';
                this.placeholder = 'Import .xlsx file';
                break;
            case 'record':
                this.type = ImportEntityType.Record;
                this.canImportFile = true;
                this.canImportMessage = false;
                this.title = 'Open Record';
                this.fileExtension = 'record';
                this.placeholder = 'Import Record .record file';
                this.canUseImportedRecords = this.canUseImportedRecords;
                this.recordSource = 'file';
                break;
            case 'schema-rule':
                this.type = ImportEntityType.SchemaRule;
                this.canImportFile = true;
                this.canImportMessage = false;
                this.title = 'Import Schema Rule';
                this.fileExtension = 'rules';
                this.placeholder = 'Import Schema Rule .rules file';
                break;
            case 'theme':
                this.type = ImportEntityType.Theme;
                this.canImportFile = true;
                this.canImportMessage = false;
                this.title = 'Import Theme';
                this.fileExtension = 'theme';
                this.placeholder = 'Import Theme .theme file';
                break;
            case 'statistic':
                this.type = ImportEntityType.Statistic;
                this.canImportFile = true;
                this.canImportMessage = false;
                this.title = 'Import Statistic';
                this.fileExtension = 'statistic';
                this.placeholder = 'Import Statistic .statistic file';
                break;
            case 'policy-label':
                this.type = ImportEntityType.PolicyLabel;
                this.canImportFile = true;
                this.canImportMessage = false;
                this.title = 'Import Label';
                this.fileExtension = 'label';
                this.placeholder = 'Import Label .label file';
                break;
            case 'formula':
                this.type = ImportEntityType.Formula;
                this.canImportFile = true;
                this.canImportMessage = false;
                this.title = 'Import Formula';
                this.fileExtension = 'formula';
                this.placeholder = 'Import Formula .formula file';
                break;
            default:
                this.type = ImportEntityType.Policy;
                this.canImportFile = true;
                this.canImportMessage = true;
                this.title = 'Import Policy';
                this.fileExtension = 'policy';
                this.placeholder = 'Import Policy .policy file';
                break;
        }
        if (this.canImportFile) {
            this.importType = ImportType.FILE;
        } else {
            this.importType = ImportType.IPFS;
        }
        if (this.canImportMessage) {
            if (_config.timeStamp) {
                this.importType = ImportType.IPFS;
                this.dataForm.patchValue({
                    timestamp: _config.timeStamp,
                });
                this.importFromMessage();
            }
        }
    }

    public setImportType(event: any): void {
        this.importType = event.index;
        this.changeDetectorRef.detectChanges();
    }

    private setResult(result: IImportEntityResult | null) {
        this.ref.close(result);
    }

    public onClose(): void {
        this.setResult(null);
    }

    public onAsyncError(error: any) {
        this.informService.processAsyncError(error);
        this.loading = false;
        this.taskId = undefined;
    }

    public onAsyncCompleted() {
        if (this.taskId) {
            const taskId: string = this.taskId;
            this.taskId = undefined;
            this.taskService.get(taskId).subscribe(
                (task) => {
                    this.loading = false;
                    const { result } = task;
                    this.setResult({
                        type: 'message',
                        data: this.dataForm.get('timestamp')?.value,
                        policy: result,
                    });
                },
                (e) => {
                    this.loading = false;
                }
            );
        }
    }

    //Open File
    public importFromFile(file: any) {
        const reader = new FileReader()
        reader.readAsArrayBuffer(file);
        reader.addEventListener('load', (e: any) => {
            const arrayBuffer = e.target.result;
            switch (this.type) {
                case ImportEntityType.Xlsx: {
                    this.excelFromFile(arrayBuffer);
                    break;
                }
                case ImportEntityType.Module: {
                    this.moduleFromFile(arrayBuffer);
                    break;
                }
                case ImportEntityType.Tool: {
                    this.toolFromFile(arrayBuffer);
                    break;
                }
                case ImportEntityType.Policy: {
                    this.policyFromFile(arrayBuffer);
                    break;
                }
                case ImportEntityType.Record: {
                    this.recordFromFile(arrayBuffer);
                    break;
                }
                case ImportEntityType.SchemaRule: {
                    this.ruleFromFile(arrayBuffer);
                    break;
                }
                case ImportEntityType.Theme: {
                    this.themeFromFile(arrayBuffer);
                    break;
                }
                case ImportEntityType.Statistic: {
                    this.statisticFromFile(arrayBuffer);
                    break;
                }
                case ImportEntityType.PolicyLabel: {
                    this.labelFromFile(arrayBuffer);
                    break;
                }
                case ImportEntityType.Formula: {
                    this.formulaFromFile(arrayBuffer);
                    break;
                }
                default: {
                    break;
                }
            }
        });
    }

    //Open message
    public importFromMessage() {
        if (!this.dataForm.valid) {
            return;
        }
        const messageId = this.dataForm.get('timestamp')?.value;
        switch (this.type) {
            case ImportEntityType.Xlsx: {
                return;
            }
            case ImportEntityType.Module: {
                this.moduleFromMessage(messageId);
                break;
            }
            case ImportEntityType.Tool: {
                this.toolFromMessage(messageId);
                break;
            }
            case ImportEntityType.Policy: {
                this.policyFromMessage(messageId);
                break;
            }
            case ImportEntityType.Record: {
                return;
            }
            case ImportEntityType.SchemaRule: {
                return;
            }
            case ImportEntityType.Theme: {
                return;
            }
            case ImportEntityType.Statistic: {
                return;
            }
            case ImportEntityType.PolicyLabel: {
                return;
            }
            case ImportEntityType.Formula: {
                return;
            }
            default: {
                return;
            }
        }
    }

    //Load preview

    //Policy
    private policyFromMessage(messageId: string) {
        this.loading = true;
        this.policyEngineService
            .pushPreviewByMessage(messageId)
            .subscribe((result) => {
                const { taskId, expectation } = result;
                this.taskId = taskId;
                this.expectedTaskMessages = expectation;
            }, (error) => {
                this.loading = false;
                this.taskId = undefined;
            });
    }
    
    public onRecordSourceChange(value: 'file' | 'imported'): void {
        this.recordSource = value;
        if (this.recordSource !== 'imported') {
            this.syncNewRecords = false;
        }
    }

    public onPrimaryAction(): void {
        if (this.type === ImportEntityType.Record && this.recordSource === 'imported') {
            this.setResult({
                type: 'message',
                data: '',
                importRecords: true,
                syncNewRecords: this.syncNewRecords
            } as any);
            return;
        }
        this.importFromMessage();
    }

    public isPrimaryActionDisabled(): boolean {
        if (this.type === ImportEntityType.Record) {
            return this.recordSource !== 'imported';
        }
        if (this.importType === ImportType.FILE) {
            return true;
        }
        return this.dataForm.invalid;
    }

    private policyFromFile(arrayBuffer: any) {
        this.loading = true;
        this.policyEngineService
            .previewByFile(arrayBuffer)
            .subscribe((result) => {
                this.loading = false;
                this.setResult({
                    type: 'file',
                    data: arrayBuffer,
                    policy: result,
                });
            }, (e) => {
                this.loading = false;
            });
    }

    //Module
    private moduleFromMessage(messageId: string) {
        this.loading = true;
        this.modulesService
            .previewByMessage(messageId)
            .subscribe((result) => {
                this.loading = false;
                this.setResult({
                    type: 'message',
                    data: messageId,
                    module: result,
                });
            }, (error) => {
                this.loading = false;
            });
    }

    private moduleFromFile(arrayBuffer: any) {
        this.loading = true;
        this.modulesService
            .previewByFile(arrayBuffer)
            .subscribe((result) => {
                this.loading = false;
                this.setResult({
                    type: 'file',
                    data: arrayBuffer,
                    module: result,
                });
            }, (e) => {
                this.loading = false;
            });
    }

    //Tool
    private toolFromMessage(messageId: string) {
        this.loading = true;
        this.toolsService
            .previewByMessage(messageId)
            .subscribe((result) => {
                this.loading = false;
                this.setResult({
                    type: 'message',
                    data: messageId,
                    tool: result
                });
            }, (error) => {
                this.loading = false;
            });
    }

    private toolFromFile(arrayBuffer: any) {
        this.loading = true;
        this.toolsService
            .previewByFile(arrayBuffer)
            .subscribe((result) => {
                this.loading = false;
                this.setResult({
                    type: 'file',
                    data: arrayBuffer,
                    tool: result
                });
            }, (e) => {
                this.loading = false;
            });
    }

    //Excel
    private excelFromFile(arrayBuffer: any) {
        this.loading = true;
        this.policyEngineService
            .previewByXlsx(arrayBuffer)
            .subscribe((result) => {
                this.loading = false;
                this.setResult({
                    type: 'file',
                    data: arrayBuffer,
                    xlsx: result
                });
            }, (e) => {
                this.loading = false;
            });
    }

    //Record
    private recordFromFile(arrayBuffer: any) {
        this.setResult({
            type: 'file',
            data: arrayBuffer
        });
    }

    //Schema rule
    private ruleFromFile(arrayBuffer: any) {
        this.loading = true;
        this.schemaRulesService
            .previewByFile(arrayBuffer)
            .subscribe((result) => {
                this.loading = false;
                this.setResult({
                    type: 'file',
                    data: arrayBuffer,
                    rule: result
                });
            }, (e) => {
                this.loading = false;
            });
    }

    //Theme
    private themeFromFile(arrayBuffer: any) {
        this.setResult({
            type: 'file',
            data: arrayBuffer,
        });
    }

    //Statistic
    private statisticFromFile(arrayBuffer: any) {
        this.loading = true;
        this.policyStatisticsService
            .previewByFile(arrayBuffer)
            .subscribe((result) => {
                this.loading = false;
                this.setResult({
                    type: 'file',
                    data: arrayBuffer,
                    statistic: result
                });
            }, (e) => {
                this.loading = false;
            });
    }

    //Label
    private labelFromFile(arrayBuffer: any) {
        this.loading = true;
        this.policyLabelsService
            .previewByFile(arrayBuffer)
            .subscribe((result) => {
                this.loading = false;
                this.setResult({
                    type: 'file',
                    data: arrayBuffer,
                    label: result
                });
            }, (e) => {
                this.loading = false;
            });
    }

    //Label
    private formulaFromFile(arrayBuffer: any) {
        this.loading = true;
        this.formulasService
            .previewByFile(arrayBuffer)
            .subscribe((result) => {
                this.loading = false;
                this.setResult({
                    type: 'file',
                    data: arrayBuffer,
                    formula: result
                });
            }, (e) => {
                this.loading = false;
            });
    }
}