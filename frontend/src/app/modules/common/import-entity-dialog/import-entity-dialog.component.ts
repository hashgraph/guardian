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

export enum ImportEntityType {
    Policy = 'policy',
    Module = 'module',
    Tool = 'tool',
    Xlsx = 'xlsx',
    Record = 'record',
    SchemaRule = 'schema-rule',
    Theme = 'theme',
    Statistic = 'statistic'
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
        private policyStatisticsService: PolicyStatisticsService
    ) {
        const _config = this.config.data || {};

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
            if (this.type === ImportEntityType.Xlsx) {
                this.excelFromFile(arrayBuffer);
            } else if (this.type === ImportEntityType.Module) {
                this.moduleFromFile(arrayBuffer);
            } else if (this.type === ImportEntityType.Tool) {
                this.toolFromFile(arrayBuffer);
            } else if (this.type === ImportEntityType.Policy) {
                this.policyFromFile(arrayBuffer);
            } else if (this.type === ImportEntityType.Record) {
                this.recordFromFile(arrayBuffer);
            } else if (this.type === ImportEntityType.SchemaRule) {
                this.ruleFromFile(arrayBuffer);
            } else if (this.type === ImportEntityType.Theme) {
                this.themeFromFile(arrayBuffer);
            } else if (this.type === ImportEntityType.Statistic) {
                this.statisticFromFile(arrayBuffer);
            }
        });
    }

    //Open message
    public importFromMessage() {
        if (!this.dataForm.valid) {
            return;
        }
        const messageId = this.dataForm.get('timestamp')?.value;
        if (this.type === ImportEntityType.Module) {
            this.moduleFromMessage(messageId);
        } else if (this.type === ImportEntityType.Tool) {
            this.toolFromMessage(messageId);
        } else if (this.type === ImportEntityType.Policy) {
            this.policyFromMessage(messageId);
        } else if (this.type === ImportEntityType.Xlsx) {
            return;
        } else if (this.type === ImportEntityType.Record) {
            return;
        } else if (this.type === ImportEntityType.SchemaRule) {
            return;
        } else if (this.type === ImportEntityType.Theme) {
            return;
        } else if (this.type === ImportEntityType.Statistic) {
            return;
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
}