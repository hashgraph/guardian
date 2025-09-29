import { ChangeDetectorRef, Component } from '@angular/core';
import { DialogService, DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { RequestDocumentBlockComponent } from '../request-document-block.component';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { RequestDocumentBlockAddonComponent } from '../../request-document-block-addon/request-document-block-addon.component';
import { SchemaRulesService } from 'src/app/services/schema-rules.service';
import { UntypedFormBuilder, UntypedFormGroup } from '@angular/forms';
import { audit, takeUntil } from 'rxjs/operators';
import {firstValueFrom, interval, Subject} from 'rxjs';
import { prepareVcData } from 'src/app/modules/common/models/prepare-vc-data';
import { DocumentValidators } from '@guardian/interfaces';
import { CustomConfirmDialogComponent } from 'src/app/modules/common/custom-confirm-dialog/custom-confirm-dialog.component';
import { ToastrService } from 'ngx-toastr';
import { ArtifactService } from 'src/app/services/artifact.service';
import { CsvService } from 'src/app/services/csv.service';
import { IPFSService } from 'src/app/services/ipfs.service';
import { IndexedDbRegistryService } from 'src/app/services/indexed-db-registry.service';

type TableValue = {
    type: 'table';
    columnKeys: string[];
    rows: Record<string, string>[];
    fileId?: string;
    cid?: string;
    idbKey?: string;
};

@Component({
    selector: 'request-document-block-dialog',
    templateUrl: './request-document-block-dialog.component.html',
    styleUrls: ['./request-document-block-dialog.component.scss'],
})
export class RequestDocumentBlockDialog {
    public loading: boolean = true;
    public parent: RequestDocumentBlockComponent | RequestDocumentBlockAddonComponent;

    public get id() { return this.parent?.id; }
    public get dryRun() { return this.parent?.dryRun; }
    public get restoreData() { return this.parent?.restoreData; }
    public get dialogTitle() { return this.parent?.dialogTitle; }
    public get schema() { return this.parent?.schema; }
    public get hideFields() { return this.parent?.hideFields; }
    public get presetDocument() { return this.parent?.presetDocument; }
    public get presetReadonlyFields() { return this.parent?.presetReadonlyFields; }
    public get policyId() { return this.parent?.policyId; }
    public get disabled() { return this.parent?.disabled; }
    public get docRef() { return this.parent?.getRef(); }

    public buttons: any = [];
    public rules: DocumentValidators;
    public dataForm: UntypedFormGroup;
    public destroy$: Subject<boolean> = new Subject<boolean>();
    public rulesResults: any;

    private buttonNames: { [id: string]: string } = {
        save: "Save",
        cancel: "Cancel",
        prev: "Previous",
        next: "Next",
        submit: "Create"
    }

    private readonly IDB_NAME = 'TABLES';
    private readonly FILES_STORE = 'FILES';

    constructor(
        public dialogRef: DynamicDialogRef,
        public config: DynamicDialogConfig,
        private dialogService: DialogService,
        private policyEngineService: PolicyEngineService,
        private schemaRulesService: SchemaRulesService,
        private fb: UntypedFormBuilder,
        private toastr: ToastrService,
        private changeDetectorRef: ChangeDetectorRef,
        private csv: CsvService,
        private artifact: ArtifactService,
        private ipfs: IPFSService,
        private idb: IndexedDbRegistryService
    ) {
        this.parent = this.config.data;
        this.dataForm = this.fb.group({});
        if (this.parent) {
            this.parent.dialog = this;
        }
    }

    ngOnInit() {
        this.loading = true;
        this.loadRules();
        this.initForm(this.dataForm);
    }

    ngOnDestroy(): void {
        this.destroy$.next(true);
        this.destroy$.unsubscribe();
    }

    public initForm($event: any) {
        this.dataForm = $event;
        this.dataForm.valueChanges
            .pipe(takeUntil(this.destroy$))
            .pipe(audit(ev => interval(1000)))
            .subscribe(val => {
                this.validate();
            });
    }

    private loadRules() {
        this.schemaRulesService
            .getSchemaRuleData({
                policyId: this.policyId,
                schemaId: this.schema?.iri,
                parentId: this.docRef?.id
            })
            .subscribe((rules: any[]) => {
                this.rules = new DocumentValidators(rules);
                setTimeout(() => {
                    this.loading = false;
                }, 500);
            }, (e) => {
                this.loading = false;
            });
    }

    private validate() {
        if (!this.rules) {
            return;
        }
        const data = this.dataForm.getRawValue();
        this.rulesResults = this.rules.validateForm(this.schema?.iri, data);
    }

    public onClose(): void {
        this.dialogRef.close(null);
    }

    public async onSubmit(draft?: boolean) {
        if (this.disabled || this.loading) {
            return;
        }
        if (this.dataForm.valid || draft) {
            const data = this.dataForm.getRawValue();
            this.loading = true;

            await this.persistTablesInDocument(data, !!this.dryRun);

            prepareVcData(data);
            this.policyEngineService
                .setBlockData(this.id, this.policyId, {
                    document: data,
                    ref: this.docRef,
                    draft,
                })
                .subscribe(() => {
                    setTimeout(() => {
                        this.loading = false;
                        if (draft && this.parent instanceof RequestDocumentBlockComponent) {
                            this.parent.draftDocument = {
                                policyId: this.parent.policyId,
                                user: this.parent.user.did,
                                blockId: this.parent.id,
                                data
                            };

                            this.toastr.success('The draft version of the document was saved successfully', '', {
                                timeOut: 3000,
                                closeButton: true,
                                positionClass: 'toast-bottom-right',
                                enableHtml: true,
                            });
                        }

                        this.dialogRef.close(null);
                    }, 1000);
                }, (e) => {
                    console.error(e.error);
                    this.loading = false;
                });
        }
    }

    public onDryRun() {
        this.parent.onDryRun();
    }

    public onRestoreClick() {
        this.parent.onRestoreClick();
    }

    public handleCancelBtnEvent($event: any, data: RequestDocumentBlockDialog) {
        data.onClose();
    }

    public handleSubmitBtnEvent($event: any, data: RequestDocumentBlockDialog) {
        if (data.dataForm.valid || !this.loading) {
            data.onSubmit();
        }
    }

    public handleSaveBtnEvent($event: any, data: RequestDocumentBlockDialog) {
        if (!this.loading) {
            if (this.parent instanceof RequestDocumentBlockComponent && this.parent.draftDocument) {
                const dialogOptionRef = this.dialogService.open(CustomConfirmDialogComponent, {
                    showHeader: false,
                    width: '640px',
                    styleClass: 'guardian-dialog draft-dialog',
                    data: {
                        header: 'Overwrite Old Draft',
                        text: 'You already have a saved draft. Are you sure you want to overwrite it? \n Please note that saving a new draft will permanently delete the previous one.',
                        buttons: [{
                            name: 'Cancel',
                            class: 'secondary'
                        }, {
                            name: 'Save Draft',
                            class: 'primary'
                        }]
                    },
                });

                dialogOptionRef.onClose.subscribe((result: string) => {
                    if (result == 'Save Draft') {
                        data.onSubmit(true);
                    }
                });
            } else {
                data.onSubmit(true);
            }
        }
    }

    public onChangeButtons($event: any) {
        setTimeout(() => {
            this.buttons = [];
            if (Array.isArray($event)) {
                for (const item of $event) {
                    this.buttons.push({
                        ...item,
                        text: this.buttonNames[item.id] || item.text
                    })
                }
            }
        }, 0);
    }

    public ifDisabledBtn(config: any) {
        if (config.id === 'submit') {
            return !this.dataForm.valid || this.loading;
        } else {
            return false;
        }
    }

    public detectChanges() {
        this.changeDetectorRef.detectChanges();
    }

    private tryParseTable(value: unknown): TableValue | null {
        if (typeof value !== 'string') {
            return null;
        }

        const trimmed = value.trim();
        if (!trimmed) {
            return null;
        }

        const looksLikeJson = trimmed.startsWith('{') || trimmed.startsWith('[');
        if (!looksLikeJson) {
            return null;
        }

        try {
            const parsed = JSON.parse(trimmed);
            if (parsed && parsed.type === 'table') {
                return parsed as TableValue;
            }
            return null;
        } catch {
            return null;
        }
    }

    private async uploadToGridFs(file: File, existingFileId?: string): Promise<{ fileId: string }> {
        const response = await firstValueFrom(this.artifact.upsertFile(file, existingFileId));
        return { fileId: response.fileId };
    }

    private async uploadToIpfs(file: File, isDryRun: boolean): Promise<string | null> {
        if (isDryRun) {
            return null;
        }

        const observable = this.ipfs.addFile(file);
        const cid = await firstValueFrom(observable);

        if (typeof cid === 'string' && cid.trim()) {
            return cid.trim();
        }

        return null;
    }

    private async persistTablesInDocument(root: any, isDryRun: boolean): Promise<void> {
        if (!root) {
            return;
        }

        const hasFilesStore = await (async () => {
            try {
                const db = await this.idb.getDB(this.IDB_NAME);
                const contains = db.objectStoreNames.contains(this.FILES_STORE);
                db.close();
                return contains;
            } catch {
                return false;
            }
        })();

        const loadFileFromIdb = async (idbKey: string): Promise<File | null> => {
            if (!hasFilesStore || !idbKey) {
                return null;
            }

            try {
                const record: any = await this.idb.get(this.IDB_NAME, this.FILES_STORE, idbKey);
                if (!record || !record.blob) {
                    return null;
                }

                const blob: Blob = record.blob as Blob;

                const fileName =
                    (typeof record.originalName === 'string' && record.originalName)
                        ? record.originalName
                        : 'table.csv.gz';

                const mimeType =
                    (blob as any)?.type && String((blob as any).type).trim()
                        ? String((blob as any).type).trim()
                        : 'application/gzip';

                return new File([blob], fileName, { type: mimeType });
            } catch {
                return null;
            }
        };

        const deleteFromIdbIfAny = async (idbKey?: string): Promise<void> => {
            const key = (idbKey || '').trim();

            if (!hasFilesStore || !key) {
                return;
            }

            try {
                await this.idb.delete(this.IDB_NAME, this.FILES_STORE, key);
            } catch {
                // ignore
            }
        };

        const toCompactJson = (fileId?: string | null, cid?: string | null): string => {
            const compact: any = { type: 'table' };

            if (typeof fileId === 'string' && fileId.trim()) {
                compact.fileId = fileId.trim();
            }

            if (typeof cid === 'string' && cid.trim()) {
                compact.cid = cid.trim();
            }

            return JSON.stringify(compact);
        };

        const visitArray = async (array: any[]): Promise<void> => {
            for (const element of array) {
                await visitNode(element);
            }
        };

        const visitObject = async (object: Record<string, any>): Promise<void> => {
            const keys = Object.keys(object);

            for (const key of keys) {
                const value = object[key];

                if (typeof value === 'string') {
                    const table = this.tryParseTable(value);
                    const isTable = !!table && table.type === 'table';

                    if (isTable) {
                        const idbKey = (table!.idbKey || '').trim();
                        const existingFileId = (table!.fileId || '').trim();
                        const existingCid = (table!.cid || '').trim();

                        let fileFromIdb: File | null = null;

                        if (idbKey) {
                            fileFromIdb = await loadFileFromIdb(idbKey);
                        }

                        if (fileFromIdb) {
                            const grid = await this.uploadToGridFs(fileFromIdb, existingFileId || undefined);
                            const cid = await this.uploadToIpfs(fileFromIdb, isDryRun);

                            await deleteFromIdbIfAny(idbKey);

                            object[key] = toCompactJson(grid.fileId, cid);
                        } else {
                            object[key] = toCompactJson(existingFileId || null, existingCid || null);
                        }

                        continue;
                    }
                }

                await visitNode(value);
            }
        };

        const visitNode = async (node: any): Promise<void> => {
            if (Array.isArray(node)) {
                await visitArray(node);
                return;
            }

            if (node && typeof node === 'object') {
                await visitObject(node as Record<string, any>);
                return;
            }
        };

        await visitNode(root);
    }
}
