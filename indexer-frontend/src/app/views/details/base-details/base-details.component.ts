import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
    IDetailsResults,
    IRelationshipsResults,
} from '@services/search.service';
import { Subscription } from 'rxjs';
import { MatTabChangeEvent } from '@angular/material/tabs';
import { Activity } from '@components/activity/activity.component';

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
    public relationships: IRelationshipsResults | null = null;
    public schema?: any;
    public tab: string = '';
    public tabIndex: number = 0;

    private _queryObserver?: Subscription;
    private _paramsObserver?: Subscription;

    activityItems: any[] = [];
    totalActivity: number = 0;

    constructor(protected route: ActivatedRoute, protected router: Router) {}

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

    protected setResult(result?: IDetailsResults): void {
        this.uuid = '';
        this.history = [];
        this.first = null;
        this.last = null;
        this.target = null;
        this.row = null;
        this.relationships = null;
        if (result) {
            if (result.activity) {
                this.handleActivities(result.activity);
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
        }
        this.tabIndex = this.getTabIndex(this.tab);
    }

    protected setRelationships(result: IRelationshipsResults): void {
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

    protected abstract onNavigate(): void;

    protected abstract loadData(): void;

    protected abstract getTabIndex(name: string): number;

    protected abstract getTabName(index: number): string;
}
