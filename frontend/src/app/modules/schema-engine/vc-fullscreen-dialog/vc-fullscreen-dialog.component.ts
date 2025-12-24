import { Component, ElementRef, ViewChild } from '@angular/core';
import { DialogService, DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { UserPermissions } from '@guardian/interfaces';
import { ActivatedRoute, Router } from '@angular/router';
import { ProfileService } from 'src/app/services/profile.service';
import { PolicyComments } from '../../common/policy-comments/policy-comments.component';
import { forkJoin, Subject, Subscription, takeUntil } from 'rxjs';
import { DocumentViewComponent } from '../document-view/document-view.component';
import { CommentsService } from 'src/app/services/comments.service';
import { ViewerDialog } from '../../policy-engine/dialogs/viewer-dialog/viewer-dialog.component';

/**
 * Dialog for display json
 */
@Component({
    selector: 'vc-fullscreen-dialog',
    templateUrl: './vc-fullscreen-dialog.component.html',
    styleUrls: ['./vc-fullscreen-dialog.component.scss']
})
export class VCFullscreenDialog {
    @ViewChild('discussionComponent', { static: false }) discussionComponent: PolicyComments;
    @ViewChild('documentViewComponent', { static: false }) documentViewComponent: DocumentViewComponent;

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
    public tags: any[] = [];

    private _destroy$ = new Subject<void>();
    private _subscription?: Subscription | null;

    constructor(
        public dialogRef: DynamicDialogRef,
        public dialogConfig: DynamicDialogConfig,
        private dialogService: DialogService,
        private profileService: ProfileService,
        private commentsService: CommentsService,
        private route: ActivatedRoute,
        private router: Router,
        private el: ElementRef
    ) {
    }

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
            destroy
        } = this.dialogConfig.data;

        this.backLabel = backLabel || 'Back'

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

        this.comments = (comments !== false) && !dryRun;
        this.commentsReadonly = commentsReadonly === true;
        this.collapse = openComments !== true;

        this.document = document;
        if (document) {
            if (typeof document === 'string') {
                this.json = document;
            } else {
                this.json = JSON.stringify((document), null, 4);
            }

            this.tags = document.tags;
        } else {
            this.type = 'JSON';
            this.toggle = false;
            this.json = '';
            this.currentTab = 1;
        }

        const fileSizeBytes = new Blob([this.json]).size;
        this.fileSize = Math.round((fileSizeBytes / (1024 * 1024)));

        this.loadProfile();

        if (destroy) {
            this._destroy$ = destroy;
        }
        this._subscription = this._destroy$.subscribe(() => {
            this.onClose();
        })
    }


    private loadProfile() {
        this.loading = true;
        if (this.comments) {
            forkJoin([
                this.profileService.getProfile(),
                this.commentsService.getPolicyCommentsCount(this.policyId, this.documentId),
            ])
                .pipe(takeUntil(this._destroy$))
                .subscribe(([
                    profile,
                    count,
                ]) => {
                    this.user = new UserPermissions(profile);
                    this.discussionData = count?.fields || {};

                    setTimeout(() => {
                        this.loading = false;
                    }, 500);
                }, (e) => {
                    this.loading = false;
                });
        } else {
            this.profileService.getProfile()
                .pipe(takeUntil(this._destroy$))
                .subscribe((profile) => {
                    this.user = new UserPermissions(profile);
                    setTimeout(() => {
                        this.loading = false;
                    }, 500);
                }, (e) => {
                    this.loading = false;
                });
        }
    }

    public onToggle(index: number) {
        this.currentTab = index;
    }

    public get isCompare(): boolean {
        return (
            (!this.dryRun) &&
            (!!this.id) &&
            (!!this.user?.ANALYTIC_DOCUMENT_READ) &&
            (this.type === 'VC' || this.type === 'VP')
        );
    }

    public get isExport(): boolean {
        return (
            this.exportDocument &&
            (!this.dryRun) &&
            (!!this.messageId) &&
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
                related: this.messageId
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
