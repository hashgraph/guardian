import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { Activity } from '@components/activity/activity.component';
import { Relationships } from '@indexer/interfaces';
import CID from 'cids';
import { EntitiesService } from '@services/entities.service';
import { DialogService } from 'primeng/dynamicdialog';
import { ViewerDialog } from '../../../dialogs/viewer-dialog/viewer-dialog.component';

@Component({
    selector: 'base-details',
    template: '',
    styles: [],
})
export abstract class BaseDetailsComponent {
    public loading: boolean = true;
    public id: string = '';
    public serialNumber: string = '';

    public uuid: string = '';
    public history: any[] = [];
    public first: any = null;
    public last: any = null;
    public target: any = null;
    public row: any = null;
    public relationships: Relationships | null = null;
    public schema?: any;
    public tab: string = '';
    public tabIndex: number = 0;
    public tags: any[] = [];

    private _queryObserver?: Subscription;
    private _paramsObserver?: Subscription;

    activityItems: any[] = [];
    totalActivity: number = 0;

    constructor(
        protected entitiesService: EntitiesService,
        protected dialogService: DialogService,
        protected route: ActivatedRoute,
        protected router: Router
    ) { }

    ngOnInit() {
        this.loading = false;
        this._queryObserver = this.route.queryParams.subscribe((params) => {
            const tab = params['tab'];
            if (this.id) {
                if (this.tab !== tab) {
                    this.tab = tab;
                    this.tabIndex = this.getTabIndex(tab);
                    this.onNavigate();
                }
            } else {
                this.tab = tab;
                this.tabIndex = this.getTabIndex(tab);
            }
        });
        this._paramsObserver = this.route.params.subscribe((params) => {
            const id = params['id'];
            if (this.id !== id) {
                this.id = id;
                const serialNumber = params['serialNumber'];
                if (serialNumber) {
                    this.serialNumber = serialNumber;
                }
                this.loadData();
                this.onNavigate();
            }
        });
    }

    ngOnDestroy(): void {
        this._queryObserver?.unsubscribe();
        this._paramsObserver?.unsubscribe();
    }

    getActivityHandler(activity: string) {
        switch (activity) {
            case Activity.Registries:
                return () => this.onOpenRegistries();
            case Activity.Topics:
                return () => this.onOpenTopics();
            case Activity.Policies:
                return () => this.onOpenPolicies();
            case Activity.Tools:
                return () => this.onOpenTools();
            case Activity.Modules:
                return () => this.onOpenModules();
            case Activity.Schemas:
                return () => this.onOpenSchemas();
            case Activity.Tokens:
                return () => this.onOpenTokens();
            case Activity.Roles:
                return () => this.onOpenRoles();
            case Activity.DIDs:
                return () => this.onOpenDIDs();
            case Activity.VCs:
                return () => this.onOpenVCs();
            case Activity.VPs:
                return () => this.onOpenVPs();
            case Activity.Contracts:
                return () => this.onOpenContracts();
            case Activity.Users:
                return () => this.onOpenUsers();
            case Activity.Formulas:
                return () => this.onOpenFormulas();
            case Activity.SchemaPackages:
                return () => this.onOpenSchemaPackage();
            default:
                throw new Error(`Unknown activity: ${activity}`);
        }
    }

    protected onOpenRegistries() {
        this.router.navigate(['/registries']);
    }

    protected onOpenTopics() {
        this.router.navigate(['/topics']);
    }

    protected onOpenPolicies() {
        this.router.navigate(['/policies']);
    }

    protected onOpenTools() {
        this.router.navigate(['/tools']);
    }

    protected onOpenModules() {
        this.router.navigate(['/modules']);
    }

    protected onOpenSchemas() {
        this.router.navigate(['/schemas']);
    }

    protected onOpenSchemaPackage() {
        this.router.navigate(['/schemas-packages']);
    }

    protected onOpenTokens() {
        this.router.navigate(['/tokens']);
    }

    protected onOpenRoles() {
        this.router.navigate(['/roles']);
    }

    protected onOpenDIDs() {
        this.router.navigate(['/did-documents']);
    }

    protected onOpenVCs() {
        this.router.navigate(['/vc-documents']);
    }

    protected onOpenVPs() {
        this.router.navigate(['/vp-documents']);
    }

    protected onOpenContracts() {
        this.router.navigate(['/contracts']);
    }

    protected onOpenUsers() {
        this.router.navigate(['/registry-users']);
    }

    protected onOpenFormulas() {
        this.router.navigate(['/formulas']);
    }


    protected handleActivities(activity: any) {
        this.totalActivity = 0;
        this.activityItems = [];
        // tslint:disable-next-line:forin
        for (const name in activity) {
            this.totalActivity += activity[name];
        }
        // tslint:disable-next-line:forin
        for (const name in activity) {
            const value =
                activity[name] > 0
                    ? Math.round((activity[name] * 100) / this.totalActivity)
                    : 0;
            this.activityItems.push({
                label: 'details.activity.' + name,
                count: activity[name],
                activity: name,
                value,
                click: this.getActivityHandler(name),
            });
        }
    }

    protected onLoadDocument(first: any) {
        this.loading = true;
        this.entitiesService
            .updateFiles(first.consensusTimestamp)
            .subscribe({
                next: (result) => {
                    if (result) {
                        this.first = result;
                        this.setFiles(this.first);
                    }
                    setTimeout(() => {
                        this.loading = false;
                    }, 500);
                },
                error: ({ message }) => {
                    this.loading = false;
                    console.error(message);
                },
            });
    }

    protected setResult(result?: any): void {
        this.uuid = '';
        this.history = [];
        this.first = null;
        this.last = null;
        this.target = null;
        this.row = null;
        this.relationships = null;
        this.tags = [];
        if (result) {
            if (result.activity) {
                this.handleActivities(result.activity);
            }
            if (Array.isArray(result.tags)) {
                this.tags.push(...result.tags);
            }
            this.row = result.row;
            this.target = result.item;
            if (Array.isArray(result.history)) {
                this.history = result.history;
                this.first = this.history[0] || this.target;
                this.last = this.history[this.history.length] || this.target;
            } else {
                this.first = this.target;
                this.last = this.target;
                this.history = [this.target];
            }
            this.setFiles(this.first);
        }
        this.tabIndex = this.getTabIndex(this.tab);
    }

    protected setFiles(item: any) {
        if (item) {
            if (Array.isArray(item.files)) {
                item._ipfs = [];
                item._ipfsStatus = true;
                for (let i = 0; i < item.files.length; i++) {
                    const url = item.files[i];
                    const document = item.documents?.[i];
                    const json = this.getDocument(document);
                    const documentObject = this.getDocumentObject(document);
                    const credentialSubject = this.getCredentialSubject(documentObject);
                    const verifiableCredential = this.getVerifiableCredential(documentObject);
                    const cid = new CID(url);
                    const ipfs = {
                        version: cid.version,
                        cid: url,
                        global: cid.toV1().toString('base32'),
                        document,
                        json,
                        documentObject,
                        credentialSubject,
                        verifiableCredential
                    }
                    if (!document) {
                        item._ipfsStatus = false;
                    }
                    item._ipfs.push(ipfs);

                    if (documentObject && Array.isArray(documentObject.tags)) {
                        this.tags.push(...documentObject.tags);
                    }
                }
            }
        }
    }

    protected getDocument(item: any): string {
        try {
            return JSON.stringify(JSON.parse(item), null, 4);
        } catch (error) {
            console.log(error);
            return '';
        }
    }

    protected getDocumentObject(item: any): any {
        try {
            return JSON.parse(item);
        } catch (error) {
            console.log(error);
            return null;
        }
    }

    protected getCredentialSubject(item: any): any {
        try {
            return item.credentialSubject[0];
        } catch (error) {
            return {};
        }
    }

    protected getVerifiableCredential(item: any): any[] {
        try {
            return item.verifiableCredential;
        } catch (error) {
            return [];
        }
    }

    protected getFirstDocument() {
        return this.first._ipfs[0];
    }

    protected setRelationships(result: Relationships): void {
        this.relationships = result;
    }

    protected setTab(tab: string): void {
        this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { tab },
            queryParamsHandling: 'merge',
            replaceUrl: true,
        });
    }

    protected onTab(index: number | any) {
        this.setTab(this.getTabName(index));
    }

    protected toEntity(type: string, id: string, tab?: string) {
        const queryParams = tab ? { tab } : undefined;
        const option = queryParams ? { queryParams } : undefined;
        switch (type) {
            case 'EVC-Document':
            case 'VC-Document': {
                this.router.navigate([`/vc-documents/${id}`], option);
                break;
            }
            case 'DID-Document': {
                this.router.navigate([`/did-documents/${id}`], option);
                break;
            }
            case 'Schema':
            case 'schema-document': {
                this.router.navigate([`/schemas/${id}`], option);
                break;
            }
            case 'Policy': {
                this.router.navigate([`/policies/${id}`], option);
                break;
            }
            case 'Instance-Policy': {
                this.router.navigate([`/policies/${id}`], option);
                break;
            }
            case 'VP-Document': {
                this.router.navigate([`/vp-documents/${id}`], option);
                break;
            }
            case 'Standard Registry': {
                this.router.navigate([`/registries/${id}`], option);
                break;
            }
            case 'Topic': {
                this.router.navigate([`/topics/${id}`], option);
                break;
            }
            case 'Token': {
                this.router.navigate([`/tokens/${id}`], option);
                break;
            }
            case 'Module': {
                this.router.navigate([`/modules/${id}`], option);
                break;
            }
            case 'Tool': {
                this.router.navigate([`/tools/${id}`], option);
                break;
            }
            case 'Tag': {
                this.router.navigate([`/tags/${id}`], option);
                break;
            }
            case 'Role-Document': {
                this.router.navigate([`/roles/${id}`], option);
                break;
            }
            case 'Synchronization Event': {
                this.router.navigate([`/events/${id}`], option);
                break;
            }
            case 'Contract': {
                this.router.navigate([`/contracts/${id}`], option);
                break;
            }
            default: {
                break;
            }
        }
    }

    protected onOpenTag(tag: any) {
        this.dialogService.open(ViewerDialog, {
            showHeader: false,
            focusOnShow: false,
            width: '850px',
            styleClass: 'guardian-dialog',
            data: {
                title: 'Tag',
                type: 'JSON',
                value: tag,
            }
        });
    }

    protected abstract onNavigate(): void;

    protected abstract loadData(): void;

    protected abstract getTabIndex(name: string): number;

    protected abstract getTabName(index: number): string;
}
