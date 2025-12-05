import {
    ChangeDetectorRef,
    Component,
    ElementRef,
    ViewChild,
} from '@angular/core';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import {
    DocumentValidators,
    Schema,
    SchemaRuleValidateResult,
    UserPermissions,
} from '@guardian/interfaces';
import { ActivatedRoute, Router } from '@angular/router';
import { ProfileService } from 'src/app/services/profile.service';
import { PolicyComments } from '../../common/policy-comments/policy-comments.component';
import { forkJoin, Subject, Subscription, takeUntil } from 'rxjs';
import { DocumentViewComponent } from '../document-view/document-view.component';
import { CommentsService } from 'src/app/services/comments.service';
import { FormulasService } from 'src/app/services/formulas.service';
import { SchemaRulesService } from 'src/app/services/schema-rules.service';
import { SchemaService } from 'src/app/services/schema.service';

/**
 * Dialog for display json
 */
@Component({
    selector: 'vc-fullscreen-dialog',
    templateUrl: './vc-fullscreen-dialog.component.html',
    styleUrls: ['./vc-fullscreen-dialog.component.scss'],
})
export class VCFullscreenDialog {
    @ViewChild('discussionComponent', { static: false })
    discussionComponent: PolicyComments;
    @ViewChild('documentViewComponent', { static: false })
    documentViewComponent: DocumentViewComponent;

    public loading: boolean = true;

    public user: UserPermissions = new UserPermissions();

    public backLabel: string = '';
    public title: string = '';
    public type: 'VP' | 'VC' | 'JSON' | 'TEXT' = 'JSON';
    public toggle: boolean = false;
    public currentTab: number = 1;

    public row?: any;
    public messageId?: string;
    public dryRun: boolean = false;
    public id: string = '';
    public getByUser: boolean = false;
    public policyId?: string;
    public documentId?: string;
    public schemaId?: string;
    public schema?: any;
    public document: any;
    public relayerAccount?: string;
    public json: string = '';
    public fileSize: number = 0;
    public collapse: boolean = false;
    public discussionData: any = {};
    public discussionAction: boolean = false;
    public exportDocument: boolean;
    public key: boolean;
    public comments: boolean;
    public commentsReadonly: boolean;

    public isCurrentUserIssuer: boolean = false;
    public isEditMode: boolean = false;
    public subjects: any[] = [];
    public schemaMap: { [x: string]: Schema | null } = {};
    public rules: DocumentValidators;
    public rulesResults: SchemaRuleValidateResult;
    public formulasResults: any | null;
    public pageIndex: number = 0;
    public pageSize: number = 5;

    private _destroy$ = new Subject<void>();
    private _subscription?: Subscription | null;

    constructor(
        public dialogRef: DynamicDialogRef,
        public dialogConfig: DynamicDialogConfig,
        private profileService: ProfileService,
        private commentsService: CommentsService,
        private route: ActivatedRoute,
        private router: Router,
        private el: ElementRef,
        private schemaService: SchemaService,
        private schemaRulesService: SchemaRulesService,
        private formulasService: FormulasService,
        private ref: ChangeDetectorRef
    ) {}

    ngOnInit() {
        const {
            type,
            title,
            backLabel,
            dryRun,
            id,
            row,
            schema,
            document,
            exportDocument,
            key,
            comments,
            commentsReadonly,
            openComments,
            destroy,
        } = this.dialogConfig.data;

        this.backLabel = backLabel || 'Back';

        if (type === 'VC') {
            this.type = 'VC';
            this.toggle = true;
            this.title = title || 'VC Document';
            this.currentTab = 0;
        } else if (type === 'VP') {
            this.type = 'VP';
            this.toggle = true;
            this.title = title || 'VP Document';
            this.currentTab = 0;
        } else {
            this.type = 'JSON';
            this.toggle = false;
            this.title = title || 'Document';
            this.currentTab = 1;
        }

        if (row) {
            this.row = row;
            this.documentId = row.id;
            this.policyId = row.policyId;
            this.messageId = row.messageId;
            this.schemaId = row.schema;
            this.relayerAccount = row.relayerAccount;
        }

        this.id = id;
        this.dryRun = !!dryRun;
        this.getByUser = false;
        this.schema = schema;

        this.exportDocument = exportDocument !== false;
        this.key = key === true;

        this.comments = comments !== false && !dryRun;
        this.commentsReadonly = commentsReadonly === true;
        this.collapse = openComments !== true;

        this.document = document;
        if (document) {
            if (typeof document === 'string') {
                this.json = document;
            } else {
                this.json = JSON.stringify(document, null, 4);
            }
        } else {
            this.type = 'JSON';
            this.toggle = false;
            this.json = '';
            this.currentTab = 1;
        }

        const fileSizeBytes = new Blob([this.json]).size;
        this.fileSize = Math.round(fileSizeBytes / (1024 * 1024));

        this.setSubjects();

        this.loadProfile();

        if (destroy) {
            this._destroy$ = destroy;
        }
        this._subscription = this._destroy$.subscribe(() => {
            this.onClose();
        });
    }

    private loadProfile() {
        this.loading = true;
        if (this.comments) {
            forkJoin([
                this.profileService.getProfile(),
                this.commentsService.getPolicyCommentsCount(
                    this.policyId,
                    this.documentId
                ),
            ])
                .pipe(takeUntil(this._destroy$))
                .subscribe(
                    ([profile, count]) => {
                        this.user = new UserPermissions(profile);
                        this.discussionData = count?.fields || {};
                        this.isCurrentUserIssuer =
                            this.user?.did === this.document?.issuer;

                        setTimeout(() => {
                            this.loading = false;
                        }, 500);
                    },
                    (e) => {
                        this.loading = false;
                    }
                );
        } else {
            this.profileService
                .getProfile()
                .pipe(takeUntil(this._destroy$))
                .subscribe(
                    (profile) => {
                        this.user = new UserPermissions(profile);
                        this.isCurrentUserIssuer =
                            this.user?.did === this.document?.issuer;
                        setTimeout(() => {
                            this.loading = false;
                        }, 500);
                    },
                    (e) => {
                        this.loading = false;
                    }
                );
        }
    }

    public onToggle(index: number) {
        this.currentTab = index;
    }

    public get isCompare(): boolean {
        return (
            !this.dryRun &&
            !!this.id &&
            !!this.user?.ANALYTIC_DOCUMENT_READ &&
            (this.type === 'VC' || this.type === 'VP')
        );
    }

    public get isExport(): boolean {
        return (
            this.exportDocument &&
            !this.dryRun &&
            !!this.messageId &&
            (this.type === 'VC' || this.type === 'VP')
        );
    }

    public onClose(): void {
        try {
            this._subscription?.unsubscribe();
            this._subscription = null;
            this.dialogRef.close(null);
        } catch (error) {
            console.error(error);
        }
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
                related: this.messageId,
            },
            queryParamsHandling: 'merge',
        });
    }

    public onDownloadJsonFile() {
        const data = this.json;
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = (this.documentId || this.id) + '.json';
        a.click();

        URL.revokeObjectURL(url);
    }

    public onLinkField($event: any) {
        this.documentViewComponent?.openField($event);
        setTimeout(() => {
            this.el.nativeElement
                ?.querySelector('.form-body')
                ?.querySelector(`[field-id="${$event}"]`)
                ?.scrollIntoView();
        }, 0);
        setTimeout(() => {
            this.el.nativeElement
                ?.querySelector('.form-body')
                ?.querySelector(`[field-id="${$event}"]`)
                ?.scrollIntoView();
            this.documentViewComponent?.openField();
        }, 600);
    }

    public onCollapse($event: boolean) {
        this.collapse = $event;
    }

    public onDiscussionAction($event: any) {
        if (this.discussionComponent) {
            this.discussionComponent.onDiscussionAction($event);
        }
    }

    public onDiscussionView($event: any) {
        if ($event?.type === 'messages') {
            this.discussionAction = !this.commentsReadonly;
        } else {
            this.discussionAction = false;
        }
    }

    public onEditMode() {
        if (!this.isEditMode) {
            this.loadData();
        }
        this.isEditMode = !this.isEditMode;
    }

    setSubjects() {
        if (Array.isArray(this.document.credentialSubject)) {
            for (const s of this.document.credentialSubject) {
                this.subjects.push(s);
            }
        } else {
            this.subjects.push(this.document.credentialSubject);
        }
    }

    private loadData() {
        const requests: any = {};

        //Load Schemas
        if (this.type === 'VC') {
            const schemas: any[] = [];
            for (const credentialSubject of this.subjects) {
                const type: string = credentialSubject.type;
                if (!this.schemaMap[type]) {
                    this.schemaMap[type] = null;
                }
                if (!this.schemaId) {
                    this.schemaId = `#${type}`;
                }
            }
            for (const [type, schema] of Object.entries(this.schemaMap)) {
                if (!schema) {
                    if (this.getByUser) {
                        schemas.push(
                            this.schemaService
                                .getSchemasByTypeAndUser(type)
                                .pipe(takeUntil(this._destroy$))
                        );
                    } else {
                        schemas.push(
                            this.schemaService
                                .getSchemasByType(type)
                                .pipe(takeUntil(this._destroy$))
                        );
                    }
                }
            }
            for (let i = 0; i < schemas.length; i++) {
                requests[i] = schemas[i];
            }
        }

        //Load Rules
        if (this.type === 'VC') {
            requests.rules = this.schemaRulesService
                .getSchemaRuleData({
                    policyId: this.policyId,
                    schemaId: this.schemaId,
                    documentId: this.documentId,
                })
                .pipe(takeUntil(this._destroy$));
        }

        //Load Formulas
        if (this.documentId) {
            requests.formulas = this.formulasService
                .getFormulasData({
                    policyId: this.policyId,
                    schemaId: this.schemaId,
                    documentId: this.documentId,
                })
                .pipe(takeUntil(this._destroy$));
        }

        this.loading = true;
        forkJoin(requests).subscribe(
            (results: any) => {
                //Load Rules
                if (results.rules) {
                    const rules = results.rules;
                    this.rules = new DocumentValidators(rules);
                    this.rulesResults = this.rules.validateVC(
                        this.schemaId,
                        this.document
                    );
                    delete results.rules;
                }
                //Load Schemas
                for (const schema of Object.values<any>(results)) {
                    if (schema) {
                        try {
                            let type = schema.iri || '';
                            if (type.startsWith('#')) {
                                type = type.substr(1);
                            }
                            this.schemaMap[type] = new Schema(schema);
                        } catch (error) {
                            console.error(error);
                        }
                    }
                }

                setTimeout(() => {
                    this.loading = false;
                    this.ref.detectChanges();
                }, 500);
            },
            (e) => {
                this.loading = false;
                this.ref.detectChanges();
            }
        );
    }

    public getCredentialSubject(item: any): string {
        if (this.subjects.length > 1) {
            return `Credential Subject #${this.subjects.indexOf(item) + 1}`;
        } else {
            return 'Credential Subject';
        }
    }
}
