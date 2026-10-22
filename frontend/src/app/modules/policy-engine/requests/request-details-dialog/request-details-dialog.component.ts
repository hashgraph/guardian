import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { PolicyActionStatus } from '@guardian/interfaces';
import { ExternalPoliciesService } from 'src/app/services/external-policy.service';
import {
    getDocumentBanner,
    getDocumentType,
    getOperationInfo,
    getRequestKind,
    getStatusInfo,
    hideSecrets,
    IOperationInfo,
    IStatusInfo,
    isCredentialType,
    RequestKind
} from '../request-labels';

export type RequestDetailsAction = 'approve' | 'reject' | 'cancel' | 'reload';

type DetailsView = 'form' | 'summary' | 'json';

interface ISummaryRow {
    name: string;
    value: string;
}

function text(value: any): string {
    if (value === undefined || value === null || value === '') {
        return '';
    }
    return typeof value === 'object' ? JSON.stringify(value) : String(value);
}

/**
 * Details of a request: a form for signed credentials, a summary for other operations, and the JSON
 */
@Component({
    selector: 'app-request-details-dialog',
    templateUrl: './request-details-dialog.component.html',
    styleUrls: [
        '../request-common.scss',
        './request-details-dialog.component.scss'
    ],
    standalone: false
})
export class RequestDetailsDialog implements OnInit {
    public row: any;
    public canDecide: boolean = false;
    public isLocalUser: boolean = false;

    public loading: boolean = true;
    public technicalOpen: boolean = false;
    public failed: boolean = false;
    public kind: RequestKind = 'action';
    public operation: IOperationInfo;
    public status: IStatusInfo;
    public banner: string = '';
    public documentType: string = '';

    public credential: any = null;
    public json: string = '';
    public summary: ISummaryRow[] = [];

    public views: { id: DetailsView, label: string }[] = [];
    public view: DetailsView = 'json';

    constructor(
        public dialogRef: DynamicDialogRef,
        private dialogConfig: DynamicDialogConfig,
        private externalPoliciesService: ExternalPoliciesService,
        private cdr: ChangeDetectorRef
    ) {
    }

    ngOnInit(): void {
        const { row, canDecide, isLocalUser } = this.dialogConfig.data;
        this.row = row;
        this.canDecide = !!canDecide;
        this.isLocalUser = !!isLocalUser;
        this.kind = getRequestKind(row);
        this.operation = getOperationInfo(row);
        this.status = getStatusInfo(row);
        this.documentType = getDocumentType(row);
        this.banner = getDocumentBanner(row);
        if (!row.loaded && this.kind === 'request' && row.status === PolicyActionStatus.NEW) {
            this.loading = false;
            return;
        }
        this.load();
    }

    private load(): void {
        this.loading = true;
        this.externalPoliciesService
            .getRequestDocument({ startMessageId: this.row.startMessageId })
            .subscribe((response) => {
                const body = response?.body;
                // the backend returns the reply of the policy when there is one
                this.banner = getDocumentBanner({
                    type: this.row.type,
                    status: body?.status || this.row.status
                });
                this.setDocument(body?.document || body);
                this.loading = false;
                this.cdr.markForCheck();
            }, () => {
                this.failed = true;
                this.loading = false;
                this.cdr.markForCheck();
            });
    }

    private setDocument(wrapper: any): void {
        this.json = wrapper ? JSON.stringify(hideSecrets(wrapper), null, 4) : '';
        this.credential = null;
        this.summary = [];
        this.views = [];

        const type = wrapper?.type || this.documentType;
        if (isCredentialType(type) && wrapper?.document?.credentialSubject) {
            this.credential = wrapper.document;
            this.views.push({ id: 'form', label: 'Form' });
        } else {
            this.summary = this.getSummary(type, wrapper);
            if (this.summary.length) {
                this.views.push({ id: 'summary', label: 'Summary' });
            }
        }
        if (this.json) {
            this.views.push({ id: 'json', label: 'JSON' });
        }
        this.view = this.views[0]?.id || 'json';
    }

    private getSummary(type: string, wrapper: any): ISummaryRow[] {
        if (!wrapper) {
            return [];
        }
        const rows: ISummaryRow[] = [];
        const add = (name: string, value: any) => {
            const result = text(value);
            if (result) {
                rows.push({ name, value: result });
            }
        };
        switch (type) {
            case 'associate-token':
            case 'dissociate-token': {
                const token = wrapper.token || {};
                add('Token', token.tokenSymbol ? `${token.tokenName} (${token.tokenSymbol})` : token.tokenName);
                add('Token ID', token.tokenId);
                add('Type', token.tokenType);
                break;
            }
            case 'generate-did':
                add('Topic', wrapper.topicId);
                break;
            case 'create-topic': {
                const topic = wrapper.topic || {};
                add('Name', topic.name);
                add('Description', topic.description);
                add('Type', topic.type);
                add('Memo', topic.memo);
                break;
            }
            case 'send-message': {
                add('Topic', wrapper.topic?.topicId);
                add('Message type', wrapper.document?.type || wrapper.document?.action);
                break;
            }
            case 'send-messages': {
                const topics = Array.isArray(wrapper.topics)
                    ? Array.from(new Set(wrapper.topics.map((t: any) => t?.topicId).filter((t: any) => !!t)))
                    : [];
                add('Messages', Array.isArray(wrapper.documents) ? wrapper.documents.length : '');
                add('Topics', topics.join(', '));
                break;
            }
            case 'add-relayer-account':
                add('Name', wrapper.relayerAccount?.name);
                add('Relayer account', wrapper.relayerAccount?.account);
                break;
            case 'create-policy-discussion': {
                const discussion = wrapper.discussion || {};
                add('Discussion', discussion.name);
                add('Visibility', discussion.privacy);
                break;
            }
            case 'create-policy-comment':
                add('Comment', wrapper.comment?.text);
                break;
            case 'disconnect-policy':
                add('Operation', 'Disconnect from the policy');
                break;
            default:
                break;
        }
        return rows;
    }

    public get hasDocument(): boolean {
        return this.views.length > 0;
    }

    public get isPending(): boolean {
        return this.row?.status === PolicyActionStatus.NEW;
    }

    public get canReload(): boolean {
        return this.isLocalUser && this.kind === 'request' && this.isPending && !this.row?.loaded;
    }

    public get canCancel(): boolean {
        return this.isLocalUser && this.kind !== 'request' && this.isPending;
    }

    public onView(view: DetailsView): void {
        this.view = view;
    }

    public onAction(action: RequestDetailsAction): void {
        this.dialogRef.close(action);
    }

    public onClose(): void {
        this.dialogRef.close(null);
    }
}
