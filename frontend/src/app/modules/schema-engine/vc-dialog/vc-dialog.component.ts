import { ChangeDetectorRef, Component } from '@angular/core';
import { DialogService, DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { Schema, UserPermissions, IntegrationDataTypes } from '@guardian/interfaces';
import { SchemaService } from '../../../services/schema.service';
import { forkJoin } from 'rxjs';
import { ProfileService } from 'src/app/services/profile.service';
import { ActivatedRoute, Router } from '@angular/router';
import { PolicyEngineService } from 'src/app/services/policy-engine.service';
import { ViewerDialog } from '../../policy-engine/dialogs/viewer-dialog/viewer-dialog.component';

/**
 * Dialog for display json
 */
@Component({
    selector: 'vc-dialog',
    templateUrl: './vc-dialog.component.html',
    styleUrls: ['./vc-dialog.component.scss']
})
export class VCViewerDialog {
    public IntegrationDataTypes = IntegrationDataTypes;
    public loading: boolean = true;
    public id: string = '';
    public title: string = '';
    public json: string = '';
    public text: string = '';
    public viewDocument!: boolean | string | number;
    public isVcDocument!: boolean;
    public document: any;
    public type: any;
    public isVpDocument!: boolean;
    public isJsonDocument!: boolean;
    public toggle: boolean = true;
    public schema: any;
    public dryRun: boolean = false;
    public getByUser: boolean = false;
    public viewDocumentOptions = [
        { label: 'Form View', value: true, icon: 'file' },
        { label: 'Code View', value: false, icon: 'number' }
    ];

    public policyId?: string;
    public documentId?: string;
    public schemaId?: string;
    public messageId?: string;
    public tags?: any[] = [];
    public user: UserPermissions = new UserPermissions();
    public additionalOptionsData?: {
        type: string;
        data: Record<string, string | number>;
        optionValue: string | number | boolean;
    }[];

    public fileSize: number = 0;
    public canExport: boolean = true;

    public allVcDocs: any[] = [];
    public versionOptions: { label: string; value: number }[] = [];
    public selectedVersionIndex: number = 0;

    constructor(
        public dialogRef: DynamicDialogRef,
        public dialogConfig: DynamicDialogConfig,
        private dialogService: DialogService,
        private schemaService: SchemaService,
        private profileService: ProfileService,
        private route: ActivatedRoute,
        private router: Router,
        private ref: ChangeDetectorRef,
        private policyEngineService: PolicyEngineService,
    ) {
    }

    public get isCompare(): boolean {
        return (
            !this.dryRun &&
            !!this.id &&
            !!this.user?.ANALYTIC_DOCUMENT_READ &&
            (this.isVcDocument || this.isVpDocument)
        );
    }

    ngOnInit() {
        const {
            id,
            row,
            dryRun,
            document,
            title,
            viewDocument,
            type,
            toggle,
            schema,
            schemaId,
            topicId,
            category,
            getByUser,
            additionalOptions = [],
            additionalOptionsData,
            canExport
        } = this.dialogConfig.data;

        this.policyId = row?.policyId;
        this.documentId = row?.id;
        this.schemaId = row?.schema;
        this.messageId = row?.messageId;
        this.canExport = !(canExport === false);

        this.getByUser = getByUser;
        this.id = id;
        this.dryRun = !!dryRun;
        this.title = title;
        this.json = document ? JSON.stringify((document), null, 4) : '';
        this.text = document || '';
        this.tags = document?.tags;

        const fileSizeBytes = new Blob([typeof document === 'string' ? document : JSON.stringify(document)]).size;
        this.fileSize = Math.round((fileSizeBytes / (1024 * 1024)));

        this.document = document;
        this.type = type || 'JSON';
        this.toggle = toggle !== false;
        if (!this.document) {
            this.type = 'JSON';
            this.toggle = false;
        }

        this.isVcDocument = false;
        this.isVpDocument = false;
        this.isJsonDocument = false;
        if (this.type === 'VC') {
            this.isVcDocument = true;
        } else if (this.type === 'VP') {
            this.isVpDocument = true;
        } else {
            this.isJsonDocument = true;
        }
        this.viewDocument = (viewDocument || false) && (this.isVcDocument || this.isVpDocument);
        this.schema = schema;
        this.viewDocumentOptions = [...this.viewDocumentOptions, ...additionalOptions];
        this.additionalOptionsData = additionalOptionsData;

        this.loadAllVersionVcDocuments();
        this.getSubSchemes(schemaId, topicId, category);
    }

    public onClose(): void {
        this.dialogRef.close(null);
    }

    getSubSchemes(id: string, topicId: string, category: string) {
        this.loading = true;
        const requests = [this.profileService.getProfile()];

        if (id && category) {
            requests.push(this.schemaService.getSchemaWithSubSchemas(category, id, topicId));
        }

        forkJoin(requests).subscribe(([profile, data]: any[]) => {
            this.user = new UserPermissions(profile);
            if (data && data.schema) {
                const document = new Schema(data.schema).document;
                this.json = document ? JSON.stringify((document), null, 4) : ''
                this.document = document
            }
            this.loading = false;
        }, (error) => {
            this.loading = false;
            console.error(error);
        });
    }

    public onFindInExport(): void {
        this.dialogRef.close(null);

        this.router.navigate([], {
            relativeTo: this.route,
            queryParams: {
                tab: 1,
                schemas: null,
                owners: null,
                tokens: null,
                related: this.messageId
            },
            queryParamsHandling: 'merge',
        });
    }

    public onDownloadJsonFile() {
        const data = JSON.stringify(this.document, null, 2);
        const blob = new Blob([data], { type: "application/json" });
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = this.document.id + '.json';
        a.click();

        URL.revokeObjectURL(url);
    }

    public loadAllVersionVcDocuments() {
        if (this.policyId && this.documentId) {
            this.policyEngineService.getAllVersionVcDocuments(
                this.policyId,
                this.documentId
            ).subscribe(
                (vcDocs) => {
                    if (!!vcDocs && vcDocs.length > 0) {
                        this.allVcDocs = vcDocs;
                        this.initVersionSelector();
                    }
                }
            );
        }
    }

    private initVersionSelector() {
        if (this.allVcDocs.length > 1) {
            const currentIndex = this.allVcDocs.findIndex(
                (doc) => !doc.oldVersion
            );

            this.selectedVersionIndex = currentIndex !== -1 ? currentIndex : 0;

            this.versionOptions = this.allVcDocs.map((doc, index) => {
                const date = new Date(doc.createDate).toLocaleString('en-GB', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true,
                });
                
                if (!doc.oldVersion) {
                    return { label: date + ' (Latest)', value: index };
                }
                return { label: date, value: index };
            });
        }

        this.selectVcDocument(
            this.allVcDocs[this.selectedVersionIndex]?.document
        );
    }

    public onVersionChange(event: any) {
        this.selectedVersionIndex = event.value;
        this.selectVcDocument(
            this.allVcDocs[this.selectedVersionIndex].document
        );
    }

    private selectVcDocument(document: any) {
        this.loading = true;
        this.document = document;
        this.setJson();
        this.tags = document.tags;
        setTimeout(() => {
            this.loading = false;
            this.ref.markForCheck(); 
            this.ref.detectChanges();
        }, 500);
    }

    private setJson() {
        if (this.document) {
            if (typeof document === 'string') {
                this.json = this.document;
            } else {
                this.json = JSON.stringify(this.document, null, 4);
            }
        } else {
            this.type = 'JSON';
            this.toggle = false;
            this.json = '';
        }
    }

    public onOpenTag(tag: any) {
        this.dialogService.open(ViewerDialog, {
            showHeader: false,
            width: '850px',
            styleClass: 'guardian-dialog',
            data: {
                title: 'Tag',
                type: 'JSON',
                value: tag,
            }
        });
    }
}
